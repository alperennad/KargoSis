from sqlalchemy import Column, Integer, String, Float, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(20), unique=True, nullable=False)
    capacity = Column(Float, nullable=False)  # kg
    fuel_consumption = Column(Float, default=0.15)  # litre/km
    is_rented = Column(Boolean, default=False)
    rental_cost = Column(Float, default=0)  # Kiralama maliyeti
    is_available = Column(Boolean, default=True)
    
    # İlişkiler
    cargos = relationship("Cargo", back_populates="vehicle")
    routes = relationship("Route", back_populates="vehicle")

