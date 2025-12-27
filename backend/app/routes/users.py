from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas import UserResponse
from app.routes.auth import get_admin_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Tüm kullanıcıları listele (sadece admin)"""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/{user_id}/toggle-admin")
async def toggle_admin_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Kullanıcının admin durumunu değiştir (sadece admin)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi admin durumunuzu değiştiremezsiniz")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user.is_admin = not user.is_admin
    db.commit()
    
    return {
        "message": f"Kullanıcı {'admin yapıldı' if user.is_admin else 'admin yetkisi kaldırıldı'}",
        "user_id": user.id,
        "is_admin": user.is_admin
    }

@router.put("/{user_id}/toggle-active")
async def toggle_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Kullanıcının aktif durumunu değiştir (sadece admin)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı devre dışı bırakamazsınız")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {
        "message": f"Kullanıcı {'aktif edildi' if user.is_active else 'devre dışı bırakıldı'}",
        "user_id": user.id,
        "is_active": user.is_active
    }

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Kullanıcıyı sil (sadece admin)"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    db.delete(user)
    db.commit()
    
    return {"message": "Kullanıcı silindi"}

