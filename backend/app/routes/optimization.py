from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.station import Station
from app.models.vehicle import Vehicle
from app.models.cargo import Cargo, CargoStatus
from app.models.route import Route, RouteStop
from app.models.trip import Trip
from app.schemas import OptimizationRequest, OptimizationResult, VehicleRoute, StationResponse, StationCargoInput
from app.services.route_optimizer import RouteOptimizer, Station as OpStation, Vehicle as OpVehicle
from app.routes.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/optimization", tags=["Route Optimization"])

@router.post("/calculate", response_model=OptimizationResult)
async def calculate_optimal_routes(
    request: OptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Optimal rotaları hesapla (sadece admin)
    problem_type: "unlimited" veya "limited"
    """
    # Merkez istasyonu al
    headquarters = db.query(Station).filter(Station.is_headquarters == True).first()
    if not headquarters:
        raise HTTPException(status_code=400, detail="Merkez istasyon tanımlı değil")
    
    depot = OpStation(
        id=headquarters.id,
        name=headquarters.name,
        latitude=headquarters.latitude,
        longitude=headquarters.longitude,
        cargo_count=0,
        total_weight=0
    )
    
    # İstasyonları al ve dönüştür
    stations_list = []
    for station_input in request.stations:
        if station_input.cargo_count == 0 and station_input.total_weight == 0:
            continue
            
        station = db.query(Station).filter(Station.id == station_input.station_id).first()
        if station:
            stations_list.append(OpStation(
                id=station.id,
                name=station.name,
                latitude=station.latitude,
                longitude=station.longitude,
                cargo_count=station_input.cargo_count,
                total_weight=station_input.total_weight
            ))
    
    if not stations_list:
        raise HTTPException(status_code=400, detail="Kargo bulunan istasyon yok")
    
    # Araçları al ve dönüştür
    vehicles = db.query(Vehicle).filter(Vehicle.is_available == True).all()
    if not vehicles:
        raise HTTPException(status_code=400, detail="Müsait araç yok")
    
    vehicles_list = [
        OpVehicle(
            id=v.id,
            plate_number=v.plate_number,
            capacity=v.capacity,
            is_rented=v.is_rented,
            rental_cost=v.rental_cost
        )
        for v in vehicles
    ]
    
    # Optimizasyon
    optimizer = RouteOptimizer()
    
    if request.problem_type == "unlimited":
        # Sınırsız araç problemi
        routes = optimizer.optimize_unlimited_vehicles(depot, stations_list, vehicles_list)
        rejected = []
    else:
        # Belirli sayıda araç problemi
        if request.max_vehicles:
            vehicles_list = vehicles_list[:request.max_vehicles]
        routes, rejected_stations = optimizer.optimize_limited_vehicles(
            depot, stations_list, vehicles_list, optimize_for="weight"
        )
        rejected = [
            StationCargoInput(
                station_id=s.id,
                cargo_count=s.cargo_count,
                total_weight=s.total_weight
            )
            for s in rejected_stations
        ]
    
    # Sonuçları hazırla
    vehicle_routes = []
    total_cost = 0
    total_distance = 0
    total_cargo_count = 0
    total_weight = 0
    rented_count = 0
    
    for route_info in routes:
        station_responses = [
            StationResponse(
                id=s.id,
                name=s.name,
                latitude=s.latitude,
                longitude=s.longitude,
                is_headquarters=False,
                is_active=True
            )
            for s in route_info.stations
        ]
        
        vehicle_routes.append(VehicleRoute(
            vehicle_id=route_info.vehicle.id,
            plate_number=route_info.vehicle.plate_number,
            capacity=route_info.vehicle.capacity,
            is_rented=route_info.vehicle.is_rented,
            rental_cost=route_info.vehicle.rental_cost,
            route=station_responses,
            total_distance=round(route_info.total_distance, 2),
            total_weight=route_info.total_weight,
            cargo_count=route_info.cargo_count,
            route_cost=round(route_info.route_cost, 2),
            route_geometry=route_info.route_geometry
        ))
        
        total_cost += route_info.route_cost
        total_distance += route_info.total_distance
        total_cargo_count += route_info.cargo_count
        total_weight += route_info.total_weight
        if route_info.vehicle.is_rented:
            rented_count += 1
    
    return OptimizationResult(
        total_cost=round(total_cost, 2),
        total_distance=round(total_distance, 2),
        total_cargo_count=total_cargo_count,
        total_weight=total_weight,
        vehicles_used=len(vehicle_routes),
        rented_vehicles=rented_count,
        vehicle_routes=vehicle_routes,
        rejected_cargos=rejected
    )

@router.post("/apply")
async def apply_optimization(
    request: OptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Hesaplanan rotaları uygula ve veritabanına kaydet (sadece admin)
    """
    # Önce optimizasyonu hesapla
    result = await calculate_optimal_routes(request, db, current_user)
    
    # Merkez istasyonu al
    headquarters = db.query(Station).filter(Station.is_headquarters == True).first()
    
    created_routes = []
    
    for vehicle_route in result.vehicle_routes:
        # Yeni rota oluştur
        new_route = Route(
            vehicle_id=vehicle_route.vehicle_id if vehicle_route.vehicle_id > 0 else None,
            total_distance=vehicle_route.total_distance,
            total_cost=vehicle_route.route_cost,
            total_weight=vehicle_route.total_weight,
            cargo_count=vehicle_route.cargo_count,
            status="planned",
            planned_date=datetime.now(),
            route_geometry=vehicle_route.route_geometry
        )
        
        # Kiralık araç ise yeni araç kaydı oluştur
        if vehicle_route.is_rented and vehicle_route.vehicle_id < 0:
            rental_vehicle = Vehicle(
                plate_number=vehicle_route.plate_number,
                capacity=vehicle_route.capacity,
                is_rented=True,
                rental_cost=vehicle_route.rental_cost,
                is_available=False
            )
            db.add(rental_vehicle)
            db.flush()
            new_route.vehicle_id = rental_vehicle.id
        
        db.add(new_route)
        db.flush()
        
        # Durakları ekle
        for order, station_data in enumerate(vehicle_route.route, 1):
            stop = RouteStop(
                route_id=new_route.id,
                station_id=station_data.id,
                order=order,
                cargo_weight=0,  # Sonra güncellenir
                cargo_count=0
            )
            db.add(stop)
        
        # Bu istasyonlardaki kargoları rotaya ata
        station_ids = [s.id for s in vehicle_route.route]
        cargos = db.query(Cargo).filter(
            Cargo.station_id.in_(station_ids),
            Cargo.status == CargoStatus.PENDING.value
        ).all()
        
        for cargo in cargos:
            cargo.assigned_route_id = new_route.id
            cargo.assigned_vehicle_id = new_route.vehicle_id
            cargo.status = CargoStatus.ASSIGNED.value
        
        # Sefer kaydı oluştur
        trip = Trip(
            route_id=new_route.id,
            vehicle_id=new_route.vehicle_id,
            total_distance=vehicle_route.total_distance,
            total_cost=vehicle_route.route_cost,
            cargo_count=vehicle_route.cargo_count,
            total_weight=vehicle_route.total_weight,
            status="started"
        )
        db.add(trip)
        
        created_routes.append(new_route.id)
    
    db.commit()
    
    return {
        "message": "Rotalar başarıyla oluşturuldu",
        "route_ids": created_routes,
        "total_routes": len(created_routes),
        "optimization_result": result
    }

@router.get("/scenarios")
async def get_sample_scenarios():
    """Örnek senaryoları getir"""
    scenarios = [
        {
            "name": "Senaryo 1",
            "description": "Tüm ilçelerden kargo",
            "stations": [
                {"station_name": "Başiskele", "cargo_count": 10, "total_weight": 120},
                {"station_name": "Çayırova", "cargo_count": 8, "total_weight": 80},
                {"station_name": "Darıca", "cargo_count": 15, "total_weight": 200},
                {"station_name": "Derince", "cargo_count": 10, "total_weight": 150},
                {"station_name": "Dilovası", "cargo_count": 12, "total_weight": 180},
                {"station_name": "Gebze", "cargo_count": 5, "total_weight": 70},
                {"station_name": "Gölcük", "cargo_count": 7, "total_weight": 90},
                {"station_name": "Kandıra", "cargo_count": 6, "total_weight": 60},
                {"station_name": "Karamürsel", "cargo_count": 9, "total_weight": 110},
                {"station_name": "Kartepe", "cargo_count": 11, "total_weight": 130},
                {"station_name": "Körfez", "cargo_count": 6, "total_weight": 75},
                {"station_name": "İzmit", "cargo_count": 14, "total_weight": 160}
            ]
        },
        {
            "name": "Senaryo 2",
            "description": "Yoğunluk bazı ilçelerde",
            "stations": [
                {"station_name": "Başiskele", "cargo_count": 40, "total_weight": 200},
                {"station_name": "Çayırova", "cargo_count": 35, "total_weight": 175},
                {"station_name": "Darıca", "cargo_count": 10, "total_weight": 150},
                {"station_name": "Derince", "cargo_count": 5, "total_weight": 100},
                {"station_name": "Gebze", "cargo_count": 8, "total_weight": 120},
                {"station_name": "İzmit", "cargo_count": 20, "total_weight": 160}
            ]
        },
        {
            "name": "Senaryo 3",
            "description": "Yüksek ağırlıklı kargolar",
            "stations": [
                {"station_name": "Çayırova", "cargo_count": 3, "total_weight": 700},
                {"station_name": "Dilovası", "cargo_count": 4, "total_weight": 800},
                {"station_name": "Gebze", "cargo_count": 5, "total_weight": 900},
                {"station_name": "İzmit", "cargo_count": 5, "total_weight": 300}
            ]
        },
        {
            "name": "Senaryo 4",
            "description": "Batı ilçelerinden kargo",
            "stations": [
                {"station_name": "Başiskele", "cargo_count": 30, "total_weight": 300},
                {"station_name": "Gölcük", "cargo_count": 15, "total_weight": 220},
                {"station_name": "Kandıra", "cargo_count": 5, "total_weight": 250},
                {"station_name": "Karamürsel", "cargo_count": 20, "total_weight": 180},
                {"station_name": "Kartepe", "cargo_count": 10, "total_weight": 200},
                {"station_name": "Körfez", "cargo_count": 8, "total_weight": 400}
            ]
        }
    ]
    
    return scenarios

