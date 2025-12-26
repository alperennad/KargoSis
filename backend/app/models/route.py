from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    total_distance = Column(Float, default=0)  # km
    total_cost = Column(Float, default=0)  # Toplam maliyet (yol + yakıt)
    total_weight = Column(Float, default=0)  # Toplam kargo ağırlığı
    cargo_count = Column(Integer, default=0)
    status = Column(String(20), default="planned")  # planned, active, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    planned_date = Column(DateTime, nullable=True)
    route_geometry = Column(Text, nullable=True)  # GeoJSON formatında rota geometrisi
    
    # İlişkiler
    vehicle = relationship("Vehicle", back_populates="routes")
    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.order")
    cargos = relationship("Cargo", back_populates="route")

class RouteStop(Base):
    __tablename__ = "route_stops"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    order = Column(Integer, nullable=False)  # Durak sırası
    arrival_distance = Column(Float, default=0)  # Bu durağa kadar olan mesafe
    cargo_weight = Column(Float, default=0)  # Bu duraktan alınan kargo ağırlığı
    cargo_count = Column(Integer, default=0)
    
    # İlişkiler
    route = relationship("Route", back_populates="stops")
    station = relationship("Station", back_populates="route_stops")

