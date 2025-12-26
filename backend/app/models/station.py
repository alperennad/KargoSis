from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_headquarters = Column(Boolean, default=False)  # Kocaeli Üniversitesi merkez mi?
    is_active = Column(Boolean, default=True)
    
    # İlişkiler
    cargos = relationship("Cargo", back_populates="station")
    route_stops = relationship("RouteStop", back_populates="station")

