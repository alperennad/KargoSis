from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==================== STATION SCHEMAS ====================
class StationBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    is_headquarters: bool = False

class StationCreate(StationBase):
    pass

class StationUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None

class StationResponse(StationBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

class StationWithCargo(StationResponse):
    cargo_count: int = 0
    total_weight: float = 0

# ==================== CARGO SCHEMAS ====================
class CargoStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class CargoBase(BaseModel):
    sender_name: str
    sender_phone: str
    weight: float = Field(gt=0, description="Ağırlık kg cinsinden")
    station_id: int
    delivery_date: Optional[datetime] = None

class CargoCreate(CargoBase):
    pass

class CargoResponse(CargoBase):
    id: int
    tracking_code: str
    status: str
    created_at: datetime
    assigned_vehicle_id: Optional[int] = None
    assigned_route_id: Optional[int] = None
    
    class Config:
        from_attributes = True

class CargoWithStation(CargoResponse):
    station: StationResponse

# ==================== VEHICLE SCHEMAS ====================
class VehicleBase(BaseModel):
    plate_number: str
    capacity: float = Field(gt=0)
    fuel_consumption: float = 0.15
    is_rented: bool = False
    rental_cost: float = 0

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    is_available: bool
    
    class Config:
        from_attributes = True

# ==================== ROUTE SCHEMAS ====================
class RouteStopBase(BaseModel):
    station_id: int
    order: int
    cargo_weight: float = 0
    cargo_count: int = 0

class RouteStopResponse(RouteStopBase):
    id: int
    arrival_distance: float
    station: StationResponse
    
    class Config:
        from_attributes = True

class RouteBase(BaseModel):
    vehicle_id: int
    planned_date: Optional[datetime] = None

class RouteCreate(RouteBase):
    station_ids: List[int]  # Durak istasyonları

class RouteResponse(RouteBase):
    id: int
    total_distance: float
    total_cost: float
    total_weight: float
    cargo_count: int
    status: str
    created_at: datetime
    route_geometry: Optional[str] = None
    
    class Config:
        from_attributes = True

class RouteWithDetails(RouteResponse):
    vehicle: VehicleResponse
    stops: List[RouteStopResponse]

# ==================== USER SCHEMAS ====================
class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class UserResponse(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ==================== OPTIMIZATION SCHEMAS ====================
class StationCargoInput(BaseModel):
    station_id: int
    cargo_count: int
    total_weight: float

class OptimizationRequest(BaseModel):
    stations: List[StationCargoInput]
    problem_type: str = "unlimited"  # "unlimited" veya "limited"
    max_vehicles: Optional[int] = None

class VehicleRoute(BaseModel):
    vehicle_id: int
    plate_number: str
    capacity: float
    is_rented: bool
    rental_cost: float
    route: List[StationResponse]
    total_distance: float
    total_weight: float
    cargo_count: int
    route_cost: float
    route_geometry: Optional[str] = None

class RentalVehicleRequirement(BaseModel):
    required_capacity: float
    estimated_cost: float
    reason: str

class OptimizationResult(BaseModel):
    total_cost: float
    total_distance: float
    total_cargo_count: int
    total_weight: float
    vehicles_used: int
    rented_vehicles: int
    vehicle_routes: List[VehicleRoute]
    rejected_cargos: List[StationCargoInput] = []
    rental_requirement: Optional[RentalVehicleRequirement] = None  # Kiralık araç gereksinimi

# ==================== TRIP SCHEMAS ====================
class TripResponse(BaseModel):
    id: int
    route_id: int
    vehicle_id: int
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    total_distance: float
    total_cost: float
    cargo_count: int
    total_weight: float
    
    class Config:
        from_attributes = True

# ==================== DASHBOARD SCHEMAS ====================
class DashboardStats(BaseModel):
    total_stations: int
    total_cargos: int
    pending_cargos: int
    total_vehicles: int
    available_vehicles: int
    active_routes: int
    total_trips: int
    total_distance_today: float
    total_cost_today: float

