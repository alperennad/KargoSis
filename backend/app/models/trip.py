from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Trip(Base):
    """Tüm seferlerin anlık kaydı"""
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(String(20), default="started")  # started, in_progress, completed
    total_distance = Column(Float, default=0)
    total_cost = Column(Float, default=0)
    cargo_count = Column(Integer, default=0)
    total_weight = Column(Float, default=0)
    notes = Column(Text, nullable=True)

