from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base, SessionLocal
from app.routes import (
    stations_router,
    cargos_router,
    vehicles_router,
    routes_router,
    auth_router,
    optimization_router,
    dashboard_router
)
from app.utils.seed_data import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Veritabanı tablolarını oluştur ve başlangıç verilerini ekle
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="Kargo İşletme Sistemi API",
    description="""
    Kocaeli Üniversitesi Yazılım Lab I - Kargo İşletme Sistemi
    
    Bu API, Kocaeli'nin ilçelerinden Kocaeli Üniversitesi'ne gelen kargo araçları için 
    yük ve rota planlaması yapmaktadır.
    
    ## Özellikler
    
    * **İstasyon Yönetimi** - İlçe bazlı kargo istasyonları
    * **Kargo Takibi** - Kargo oluşturma ve takip
    * **Araç Yönetimi** - Kargo araçları ve kapasiteleri
    * **Rota Optimizasyonu** - Clarke-Wright Savings algoritması ile optimal rota hesaplama
    * **Dashboard** - İstatistikler ve raporlar
    
    ## Algoritmalar
    
    * Clarke-Wright Savings algoritması (sezgisel yaklaşım)
    * Sınırsız araç ve belirli sayıda araç problemleri için çözüm
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları ekle
app.include_router(auth_router)
app.include_router(stations_router)
app.include_router(cargos_router)
app.include_router(vehicles_router)
app.include_router(routes_router)
app.include_router(optimization_router)
app.include_router(dashboard_router)

@app.get("/")
async def root():
    return {
        "message": "Kargo İşletme Sistemi API'sine hoş geldiniz",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

