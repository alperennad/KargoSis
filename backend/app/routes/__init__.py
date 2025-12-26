from .stations import router as stations_router
from .cargos import router as cargos_router
from .vehicles import router as vehicles_router
from .routes import router as routes_router
from .auth import router as auth_router
from .optimization import router as optimization_router
from .dashboard import router as dashboard_router

__all__ = [
    'stations_router', 
    'cargos_router', 
    'vehicles_router', 
    'routes_router',
    'auth_router',
    'optimization_router',
    'dashboard_router'
]

