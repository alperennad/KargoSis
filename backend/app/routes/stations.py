from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.station import Station
from app.models.cargo import Cargo
from app.schemas import StationCreate, StationResponse, StationUpdate, StationWithCargo
from app.routes.auth import get_current_user, get_admin_user
from app.models.user import User

router = APIRouter(prefix="/stations", tags=["Stations"])

@router.get("/", response_model=List[StationResponse])
async def get_all_stations(db: Session = Depends(get_db)):
    """Tüm istasyonları listele"""
    return db.query(Station).filter(Station.is_active == True).all()

@router.get("/with-cargo", response_model=List[StationWithCargo])
async def get_stations_with_cargo(db: Session = Depends(get_db)):
    """İstasyonları kargo bilgileriyle birlikte getir"""
    stations = db.query(Station).filter(Station.is_active == True).all()
    
    result = []
    for station in stations:
        cargo_stats = db.query(
            func.count(Cargo.id).label('count'),
            func.coalesce(func.sum(Cargo.weight), 0).label('weight')
        ).filter(
            Cargo.station_id == station.id,
            Cargo.status == 'pending'
        ).first()
        
        result.append(StationWithCargo(
            id=station.id,
            name=station.name,
            latitude=station.latitude,
            longitude=station.longitude,
            is_headquarters=station.is_headquarters,
            is_active=station.is_active,
            cargo_count=cargo_stats.count or 0,
            total_weight=float(cargo_stats.weight or 0)
        ))
    
    return result

@router.get("/{station_id}", response_model=StationResponse)
async def get_station(station_id: int, db: Session = Depends(get_db)):
    """Belirli bir istasyonu getir"""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="İstasyon bulunamadı")
    return station

@router.post("/", response_model=StationResponse)
async def create_station(
    station_data: StationCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Yeni istasyon ekle (sadece admin)"""
    existing = db.query(Station).filter(Station.name == station_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bir istasyon zaten var")
    
    new_station = Station(**station_data.model_dump())
    db.add(new_station)
    db.commit()
    db.refresh(new_station)
    
    return new_station

@router.put("/{station_id}", response_model=StationResponse)
async def update_station(
    station_id: int,
    station_data: StationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """İstasyon bilgilerini güncelle (sadece admin)"""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="İstasyon bulunamadı")
    
    update_data = station_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)
    
    db.commit()
    db.refresh(station)
    
    return station

@router.delete("/{station_id}")
async def delete_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """İstasyonu sil/deaktif et (sadece admin)"""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="İstasyon bulunamadı")
    
    # Soft delete
    station.is_active = False
    db.commit()
    
    return {"message": "İstasyon deaktif edildi"}

