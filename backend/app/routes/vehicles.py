from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas import VehicleCreate, VehicleResponse
from app.routes.auth import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.get("/", response_model=List[VehicleResponse])
async def get_all_vehicles(db: Session = Depends(get_db)):
    """Tüm araçları listele"""
    return db.query(Vehicle).all()

@router.get("/available", response_model=List[VehicleResponse])
async def get_available_vehicles(db: Session = Depends(get_db)):
    """Müsait araçları listele"""
    return db.query(Vehicle).filter(Vehicle.is_available == True).all()

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Belirli bir aracı getir"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    return vehicle

@router.post("/", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Yeni araç ekle (sadece admin)"""
    existing = db.query(Vehicle).filter(Vehicle.plate_number == vehicle_data.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu plaka numarası zaten kayıtlı")
    
    new_vehicle = Vehicle(**vehicle_data.model_dump())
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    
    return new_vehicle

@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Araç bilgilerini güncelle (sadece admin)"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    update_data = vehicle_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    
    db.commit()
    db.refresh(vehicle)
    
    return vehicle

@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Aracı sil (sadece admin)"""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Araç bulunamadı")
    
    db.delete(vehicle)
    db.commit()
    
    return {"message": "Araç silindi"}

