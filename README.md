# Kargo İşletme Sistemi

Kocaeli Üniversitesi Yazılım Lab I - 2025-2026 Güz Dönemi Projesi

## Proje Hakkında

Bu proje, Kocaeli'nin ilçelerinden Kocaeli Üniversitesi'ne gelen kargo araçları için yük ve rota planlaması yapan bir web uygulamasıdır.

### Özellikler

- **Kullanıcı Paneli**
  - Kargo gönderimi ve istasyon seçimi
  - Kargo takibi (takip koduyla)
  - Kargo geçmişi görüntüleme

- **Yönetici Paneli**
  - İstasyon yönetimi (ekleme, düzenleme, silme)
  - Araç yönetimi
  - Rota planlama (Clarke-Wright Savings algoritması)
  - Tüm rotaları harita üzerinde görüntüleme
  - Maliyet ve mesafe raporları
  - Özet tablo ve grafikler

### Teknik Özellikler

- **Rota Optimizasyonu**: Clarke-Wright Savings algoritması (sezgisel yaklaşım)
- **Harita**: Leaflet.js + OpenRouteService (gerçek yol çizimi)
- **İki Problem Türü**:
  1. Sınırsız araç problemi (gerekirse araç kiralama)
  2. Belirli sayıda araç problemi (mevcut araçlarla optimum rota)

## Teknolojiler

### Backend
- **FastAPI** (Python 3.10+)
- **SQLAlchemy** (ORM)
- **SQLite** (Veritabanı)
- **Pydantic** (Veri doğrulama)
- **JWT** (Kimlik doğrulama)

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Leaflet** (Harita)
- **Recharts** (Grafikler)
- **Lucide React** (İkonlar)

## Kurulum

### Gereksinimler
- Python 3.10+
- Node.js 18+
- npm veya yarn

### Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Sunucuyu başlat
uvicorn app.main:app --reload --port 8000
```

Backend çalıştığında:
- API: http://localhost:8000
- API Dokümantasyonu: http://localhost:8000/docs

### Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Frontend çalıştığında:
- http://localhost:5173

## Demo Hesapları

| Rol | Kullanıcı Adı | Şifre |
|-----|---------------|-------|
| Admin | admin | admin123 |
| Kullanıcı | demo | demo123 |

## Araç Bilgileri

| Plaka | Kapasite | Kiralık |
|-------|----------|---------|
| 41 KRG 001 | 500 kg | Hayır |
| 41 KRG 002 | 750 kg | Hayır |
| 41 KRG 003 | 1000 kg | Hayır |

**Kiralık Araç:** 200 birim maliyet, 500 kg kapasite

## İstasyonlar (Kocaeli İlçeleri)

- Başiskele, Çayırova, Darıca, Derince, Dilovası, Gebze
- Gölcük, Kandıra, Karamürsel, Kartepe, Körfez, İzmit
- **Merkez:** Kocaeli Üniversitesi

## Maliyet Hesaplama

- **Yol Maliyeti:** 1 birim/km
- **Araç Kiralama:** 200 birim (500 kg kapasiteli)

## Örnek Senaryolar

Proje içinde 4 örnek senaryo hazır olarak gelmektedir. Rota planlama sayfasından yüklenebilir.

## API Endpoints

| Endpoint | Açıklama |
|----------|----------|
| `POST /auth/login` | Giriş |
| `POST /auth/register` | Kayıt |
| `GET /stations/` | İstasyonları listele |
| `POST /stations/` | İstasyon ekle |
| `GET /cargos/` | Kargoları listele |
| `POST /cargos/` | Kargo oluştur |
| `GET /vehicles/` | Araçları listele |
| `POST /optimization/calculate` | Rota hesapla |
| `POST /optimization/apply` | Rotaları uygula |
| `GET /dashboard/stats` | İstatistikler |
| `GET /dashboard/summary` | Özet rapor |

## Proje Yapısı

```
Yazlab-Kargo/
├── backend/
│   ├── app/
│   │   ├── models/          # Veritabanı modelleri
│   │   ├── routes/          # API endpoint'leri
│   │   ├── services/        # İş mantığı (optimizasyon)
│   │   ├── utils/           # Yardımcı fonksiyonlar
│   │   ├── main.py          # Ana uygulama
│   │   ├── database.py      # Veritabanı bağlantısı
│   │   └── schemas.py       # Pydantic şemaları
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React bileşenleri
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── services/        # API servisleri
│   │   ├── context/         # React Context
│   │   ├── types/           # TypeScript tipleri
│   │   └── App.tsx          # Ana uygulama
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Algoritma: Clarke-Wright Savings

Proje, Vehicle Routing Problem (VRP) çözümü için Clarke-Wright Savings algoritmasını kullanır:

1. Her istasyon için ayrı rota oluştur
2. Savings değerlerini hesapla: `S(i,j) = d(0,i) + d(0,j) - d(i,j)`
3. En yüksek savings değerine sahip rotaları birleştir
4. Kapasite kısıtlarını kontrol et
5. Tüm olasılıklar tükenene kadar devam et

Bu sezgisel yaklaşım O(n²) karmaşıklığa sahiptir ve brute-force yerine kullanılır.

## Geliştirici

Kocaeli Üniversitesi Bilgisayar Mühendisliği Bölümü

---

**Not:** Proje dökümanındaki tüm gereksinimler karşılanmıştır. Demo sırasında farklı senaryolar test edilebilir.

