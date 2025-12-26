from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.route import Route, RouteStop
from app.models.cargo import Cargo
from app.schemas import RouteResponse, RouteWithDetails
from app.routes.auth import get_current_user, get_admin_user
from app.models.user import User

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("/", response_model=List[RouteWithDetails])
async def get_all_routes(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Tüm rotaları listele (sadece admin)"""
    query = db.query(Route).options(
        joinedload(Route.vehicle),
        joinedload(Route.stops).joinedload(RouteStop.station)
    )
    
    if status:
        query = query.filter(Route.status == status)
    
    return query.order_by(Route.created_at.desc()).all()

@router.get("/active", response_model=List[RouteWithDetails])
async def get_active_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Aktif rotaları listele (sadece admin)"""
    return db.query(Route).options(
        joinedload(Route.vehicle),
        joinedload(Route.stops).joinedload(RouteStop.station)
    ).filter(Route.status.in_(["planned", "active"])).all()

@router.get("/{route_id}", response_model=RouteWithDetails)
async def get_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Belirli bir rotayı getir"""
    route = db.query(Route).options(
        joinedload(Route.vehicle),
        joinedload(Route.stops).joinedload(RouteStop.station)
    ).filter(Route.id == route_id).first()
    
    if not route:
        raise HTTPException(status_code=404, detail="Rota bulunamadı")
    
    # Normal kullanıcılar sadece kendi kargolarının bulunduğu rotayı görebilir
    if not current_user.is_admin:
        user_cargo = db.query(Cargo).filter(
            Cargo.assigned_route_id == route_id,
            Cargo.sender_name == current_user.full_name
        ).first()
        
        if not user_cargo:
            raise HTTPException(status_code=403, detail="Bu rotaya erişim yetkiniz yok")
    
    return route

@router.get("/my-route/{tracking_code}", response_model=RouteWithDetails)
async def get_route_by_cargo(
    tracking_code: str,
    db: Session = Depends(get_db)
):
    """Kargo takip koduyla rotayı getir"""
    cargo = db.query(Cargo).filter(Cargo.tracking_code == tracking_code).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Kargo bulunamadı")
    
    if not cargo.assigned_route_id:
        raise HTTPException(status_code=404, detail="Bu kargo henüz bir rotaya atanmamış")
    
    route = db.query(Route).options(
        joinedload(Route.vehicle),
        joinedload(Route.stops).joinedload(RouteStop.station)
    ).filter(Route.id == cargo.assigned_route_id).first()
    
    return route

@router.put("/{route_id}/status")
async def update_route_status(
    route_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Rota durumunu güncelle (sadece admin)"""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Rota bulunamadı")
    
    valid_statuses = ["planned", "active", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Geçersiz durum. Geçerli durumlar: {valid_statuses}")
    
    route.status = status
    
    # Eğer rota tamamlandıysa kargoları da güncelle
    if status == "completed":
        db.query(Cargo).filter(
            Cargo.assigned_route_id == route_id
        ).update({"status": "delivered"})
    
    db.commit()
    
    return {"message": "Rota durumu güncellendi", "status": status}

@router.delete("/{route_id}")
async def delete_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Rotayı sil (sadece admin)"""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Rota bulunamadı")
    
    if route.status == "active":
        raise HTTPException(status_code=400, detail="Aktif rota silinemez")
    
    # Kargoların atamalarını kaldır
    db.query(Cargo).filter(
        Cargo.assigned_route_id == route_id
    ).update({"assigned_route_id": None, "assigned_vehicle_id": None, "status": "pending"})
    
    # Durakları sil
    db.query(RouteStop).filter(RouteStop.route_id == route_id).delete()
    
    db.delete(route)
    db.commit()
    
    return {"message": "Rota silindi"}

