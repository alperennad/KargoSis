from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.station import Station
from app.models.cargo import Cargo
from app.models.vehicle import Vehicle
from app.models.route import Route
from app.models.trip import Trip
from app.schemas import DashboardStats, TripResponse
from app.routes.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Dashboard istatistiklerini getir (sadece admin)"""
    today = datetime.now().date()
    
    # İstasyon sayısı
    total_stations = db.query(Station).filter(Station.is_active == True).count()
    
    # Kargo sayıları
    total_cargos = db.query(Cargo).count()
    pending_cargos = db.query(Cargo).filter(Cargo.status == "pending").count()
    
    # Araç sayıları
    total_vehicles = db.query(Vehicle).count()
    available_vehicles = db.query(Vehicle).filter(Vehicle.is_available == True).count()
    
    # Aktif rota sayısı
    active_routes = db.query(Route).filter(Route.status.in_(["planned", "active"])).count()
    
    # Toplam sefer sayısı
    total_trips = db.query(Trip).count()
    
    # Bugünkü mesafe ve maliyet
    today_stats = db.query(
        func.coalesce(func.sum(Trip.total_distance), 0).label('distance'),
        func.coalesce(func.sum(Trip.total_cost), 0).label('cost')
    ).filter(
        func.date(Trip.start_time) == today
    ).first()
    
    return DashboardStats(
        total_stations=total_stations,
        total_cargos=total_cargos,
        pending_cargos=pending_cargos,
        total_vehicles=total_vehicles,
        available_vehicles=available_vehicles,
        active_routes=active_routes,
        total_trips=total_trips,
        total_distance_today=float(today_stats.distance or 0),
        total_cost_today=float(today_stats.cost or 0)
    )

@router.get("/trips", response_model=list[TripResponse])
async def get_all_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Tüm seferleri listele (sadece admin)"""
    return db.query(Trip).order_by(Trip.start_time.desc()).all()

@router.get("/trips/today", response_model=list[TripResponse])
async def get_today_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Bugünkü seferleri listele (sadece admin)"""
    today = datetime.now().date()
    return db.query(Trip).filter(
        func.date(Trip.start_time) == today
    ).order_by(Trip.start_time.desc()).all()

@router.get("/summary")
async def get_summary_report(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Özet rapor oluştur (sadece admin)"""
    query = db.query(Trip)
    
    if start_date:
        query = query.filter(Trip.start_time >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Trip.start_time <= datetime.fromisoformat(end_date))
    
    trips = query.all()
    
    # Günlük özet
    daily_stats = {}
    for trip in trips:
        date_key = trip.start_time.date().isoformat()
        if date_key not in daily_stats:
            daily_stats[date_key] = {
                "date": date_key,
                "trip_count": 0,
                "total_distance": 0,
                "total_cost": 0,
                "total_cargo": 0,
                "total_weight": 0
            }
        
        daily_stats[date_key]["trip_count"] += 1
        daily_stats[date_key]["total_distance"] += trip.total_distance
        daily_stats[date_key]["total_cost"] += trip.total_cost
        daily_stats[date_key]["total_cargo"] += trip.cargo_count
        daily_stats[date_key]["total_weight"] += trip.total_weight
    
    # Genel özet
    total_trips = len(trips)
    total_distance = sum(t.total_distance for t in trips)
    total_cost = sum(t.total_cost for t in trips)
    total_cargo = sum(t.cargo_count for t in trips)
    total_weight = sum(t.total_weight for t in trips)
    
    return {
        "overall": {
            "total_trips": total_trips,
            "total_distance": round(total_distance, 2),
            "total_cost": round(total_cost, 2),
            "total_cargo": total_cargo,
            "total_weight": round(total_weight, 2),
            "average_distance_per_trip": round(total_distance / max(1, total_trips), 2),
            "average_cost_per_trip": round(total_cost / max(1, total_trips), 2)
        },
        "daily": list(daily_stats.values())
    }

