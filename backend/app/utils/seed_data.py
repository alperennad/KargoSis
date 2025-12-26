from sqlalchemy.orm import Session
import hashlib
import secrets

from app.models.station import Station
from app.models.vehicle import Vehicle
from app.models.user import User

def get_password_hash(password: str) -> str:
    """Şifre hashleme - SHA256 ile"""
    salt = secrets.token_hex(32)
    password_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return salt + password_hash

# Kocaeli ilçe koordinatları (Google Maps belediye binalarından doğrulanmış)
KOCAELI_DISTRICTS = [
    {"name": "Başiskele", "latitude": 40.7062, "longitude": 29.8436},
    {"name": "Çayırova", "latitude": 40.8272, "longitude": 29.3714},
    {"name": "Darıca", "latitude": 40.7692, "longitude": 29.3747},
    {"name": "Derince", "latitude": 40.7544, "longitude": 29.8292},
    {"name": "Dilovası", "latitude": 40.7869, "longitude": 29.5381},
    {"name": "Gebze", "latitude": 40.8027, "longitude": 29.4307},
    {"name": "Gölcük", "latitude": 40.7175, "longitude": 29.8131},
    {"name": "Kandıra", "latitude": 41.0714, "longitude": 30.1489},
    {"name": "Karamürsel", "latitude": 40.6897, "longitude": 29.6156},
    {"name": "Kartepe", "latitude": 40.7389, "longitude": 30.0342},
    {"name": "Körfez", "latitude": 40.7494, "longitude": 29.7619},
    {"name": "İzmit", "latitude": 40.7654, "longitude": 29.9167},
]

# Kocaeli Üniversitesi - Merkez (Umuttepe Kampüsü)
HEADQUARTERS = {
    "name": "Umuttepe (Kocaeli Üniversitesi)",
    "latitude": 40.8203,
    "longitude": 29.9261,
    "is_headquarters": True
}

# Başlangıç araçları
INITIAL_VEHICLES = [
    {"plate_number": "41 KRG 001", "capacity": 500, "fuel_consumption": 0.12},
    {"plate_number": "41 KRG 002", "capacity": 750, "fuel_consumption": 0.14},
    {"plate_number": "41 KRG 003", "capacity": 1000, "fuel_consumption": 0.16},
]

def seed_initial_data(db: Session):
    """Başlangıç verilerini ekle"""
    
    # Merkez istasyonu kontrol et ve ekle
    hq = db.query(Station).filter(Station.is_headquarters == True).first()
    if not hq:
        headquarters = Station(**HEADQUARTERS)
        db.add(headquarters)
        db.commit()
        print("✓ Merkez istasyon (Kocaeli Üniversitesi) eklendi")
    
    # İlçe istasyonlarını kontrol et ve ekle
    for district in KOCAELI_DISTRICTS:
        existing = db.query(Station).filter(Station.name == district["name"]).first()
        if not existing:
            station = Station(**district)
            db.add(station)
    
    db.commit()
    print(f"✓ {len(KOCAELI_DISTRICTS)} ilçe istasyonu kontrol edildi")
    
    # Araçları kontrol et ve ekle
    for vehicle_data in INITIAL_VEHICLES:
        existing = db.query(Vehicle).filter(Vehicle.plate_number == vehicle_data["plate_number"]).first()
        if not existing:
            vehicle = Vehicle(**vehicle_data)
            db.add(vehicle)
    
    db.commit()
    print(f"✓ {len(INITIAL_VEHICLES)} araç kontrol edildi")
    
    # Admin kullanıcısı kontrol et ve ekle
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin_user = User(
            username="admin",
            email="admin@kocaeli.edu.tr",
            full_name="Sistem Yöneticisi",
            hashed_password=get_password_hash("admin123"),
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        print("✓ Admin kullanıcısı eklendi (admin/admin123)")
    
    # Demo kullanıcısı
    demo = db.query(User).filter(User.username == "demo").first()
    if not demo:
        demo_user = User(
            username="demo",
            email="demo@kocaeli.edu.tr",
            full_name="Demo Kullanıcı",
            hashed_password=get_password_hash("demo123"),
            is_admin=False
        )
        db.add(demo_user)
        db.commit()
        print("✓ Demo kullanıcısı eklendi (demo/demo123)")
    
    print("\n🚀 Veritabanı hazır!")

