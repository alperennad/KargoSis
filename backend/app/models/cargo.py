from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class CargoStatus(str, enum.Enum):
    PENDING = "pending"           # Beklemede
    ASSIGNED = "assigned"         # Araca atandı
    IN_TRANSIT = "in_transit"     # Taşınıyor
    DELIVERED = "delivered"       # Teslim edildi
    CANCELLED = "cancelled"       # İptal

class Cargo(Base):
    __tablename__ = "cargos"

    id = Column(Integer, primary_key=True, index=True)
    tracking_code = Column(String(20), unique=True, nullable=False)
    sender_name = Column(String(100), nullable=False)
    sender_phone = Column(String(20), nullable=False)
    weight = Column(Float, nullable=False)  # kg
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    status = Column(String(20), default=CargoStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivery_date = Column(DateTime, nullable=True)  # Planlanan teslimat tarihi
    
    # Atanan araç ve rota bilgisi
    assigned_vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    assigned_route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    
    # İlişkiler
    station = relationship("Station", back_populates="cargos")
    vehicle = relationship("Vehicle", back_populates="cargos")
    route = relationship("Route", back_populates="cargos")

