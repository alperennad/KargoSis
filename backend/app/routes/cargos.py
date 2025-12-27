from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import random
import string
from datetime import datetime

from app.database import get_db
from app.models.cargo import Cargo, CargoStatus
from app.models.station import Station
from app.schemas import CargoCreate, CargoResponse, CargoWithStation
from app.routes.auth import get_current_user, get_admin_user
from app.models.user import User

router = APIRouter(prefix="/cargos", tags=["Cargos"])

def generate_tracking_code() -> str:
    """Benzersiz takip kodu oluştur"""
    prefix = "KRG"
    timestamp = datetime.now().strftime("%y%m%d")
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{timestamp}{random_part}"

@router.get("/", response_model=List[CargoWithStation])
async def get_all_cargos(
    status: Optional[str] = None,
    station_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Tüm kargoları listele"""
    query = db.query(Cargo).options(joinedload(Cargo.station))
    
    if status:
        query = query.filter(Cargo.status == status)
    if station_id:
        query = query.filter(Cargo.station_id == station_id)
    
    # Normal kullanıcılar sadece kendi kargolarını görebilir
    if not current_user.is_admin:
        query = query.filter(Cargo.user_id == current_user.id)
    
    return query.order_by(Cargo.created_at.desc()).all()

@router.get("/pending", response_model=List[CargoWithStation])
async def get_pending_cargos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Bekleyen kargoları listele (sadece admin)"""
    return db.query(Cargo).options(
        joinedload(Cargo.station)
    ).filter(Cargo.status == CargoStatus.PENDING.value).all()

@router.get("/tracking/{tracking_code}", response_model=CargoWithStation)
async def track_cargo(tracking_code: str, db: Session = Depends(get_db)):
    """Kargo takibi (herkese açık)"""
    cargo = db.query(Cargo).options(
        joinedload(Cargo.station)
    ).filter(Cargo.tracking_code == tracking_code).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    return cargo

@router.get("/{cargo_id}", response_model=CargoWithStation)
async def get_cargo(
    cargo_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Belirli bir kargoyu getir"""
    cargo = db.query(Cargo).options(
        joinedload(Cargo.station)
    ).filter(Cargo.id == cargo_id).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    return cargo

@router.post("/", response_model=CargoResponse)
async def create_cargo(
    cargo_data: CargoCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Yeni kargo oluştur"""
    # İstasyon kontrolü
    station = db.query(Station).filter(
        Station.id == cargo_data.station_id,
        Station.is_active == True
    ).first()
    
    if not station:
        raise HTTPException(status_code=400, detail="Geçersiz istasyon")
    
    if station.is_headquarters:
        raise HTTPException(status_code=400, detail="Merkez istasyondan kargo gönderilemez")
    
    # Takip kodu oluştur
    tracking_code = generate_tracking_code()
    while db.query(Cargo).filter(Cargo.tracking_code == tracking_code).first():
        tracking_code = generate_tracking_code()
    
    new_cargo = Cargo(
        **cargo_data.model_dump(),
        tracking_code=tracking_code,
        status=CargoStatus.PENDING.value,
        user_id=current_user.id
    )
    
    db.add(new_cargo)
    db.commit()
    db.refresh(new_cargo)
    
    return new_cargo

@router.put("/{cargo_id}/status")
async def update_cargo_status(
    cargo_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Kargo durumunu güncelle (sadece admin)"""
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    try:
        CargoStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    
    cargo.status = status
    db.commit()
    
    return {"message": "Kargo durumu güncellendi", "status": status}

@router.delete("/{cargo_id}")
async def cancel_cargo(
    cargo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Kargoyu iptal et"""
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    if cargo.status not in [CargoStatus.PENDING.value, CargoStatus.ASSIGNED.value]:
        raise HTTPException(status_code=400, detail="Bu kargo iptal edilemez")
    
    cargo.status = CargoStatus.CANCELLED.value
    db.commit()
    
    return {"message": "Kargo iptal edildi"}

