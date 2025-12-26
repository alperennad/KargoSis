import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, User, Phone, Scale, CheckCircle, AlertCircle } from 'lucide-react';
import { stationsAPI, cargosAPI } from '../../services/api';
import type { Station } from '../../types';
import MapComponent from '../../components/MapComponent';

export default function SendCargoPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_phone: '',
    weight: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ trackingCode: string } | null>(null);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await stationsAPI.getAll();
        // Merkez istasyonunu filtrele
        setStations(data.filter((s) => !s.is_headquarters));
      } catch (error) {
        console.error('İstasyonlar alınamadı:', error);
      }
    };
    fetchStations();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) {
      setError('Lütfen bir istasyon seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cargo = await cargosAPI.create({
        sender_name: formData.sender_name,
        sender_phone: formData.sender_phone,
        weight: parseFloat(formData.weight),
        station_id: selectedStation.id,
      });

      setSuccess({ trackingCode: cargo.tracking_code });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Kargo oluşturulamadı');
      } else {
        setError('Kargo oluşturulamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card-elevated text-center animate-slide-up">
          <div className="w-20 h-20 bg-accent-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-accent-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-dark-50 mb-4">
            Kargo Başarıyla Oluşturuldu!
          </h1>
          <p className="text-dark-400 mb-6">
            Kargonuz sisteme kaydedildi. Takip kodunuz:
          </p>
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 mb-8">
            <p className="font-mono text-3xl text-primary-400">{success.trackingCode}</p>
          </div>
          <p className="text-dark-500 text-sm mb-8">
            Bu kodu saklayın. Kargo takibi için kullanabilirsiniz.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({ sender_name: '', sender_phone: '', weight: '' });
                setSelectedStation(null);
              }}
              className="btn-secondary"
            >
              Yeni Kargo Gönder
            </button>
            <button
              onClick={() => navigate('/user/my-cargo')}
              className="btn-primary"
            >
              Kargolarıma Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50">Kargo Gönder</h1>
        <p className="text-dark-400 mt-2">
          Göndermek istediğiniz istasyonu seçin ve kargo bilgilerini doldurun.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Map */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-xl font-semibold text-dark-100">
              İstasyon Seçin
            </h2>
          </div>
          <p className="text-dark-400 text-sm mb-4">
            Haritadan veya listeden bir istasyon seçin
          </p>

          <div className="h-[300px] rounded-xl overflow-hidden mb-4">
            <MapComponent
              stations={stations}
              highlightStationId={selectedStation?.id}
              onStationClick={(station) => setSelectedStation(station)}
            />
          </div>

          {/* Station List */}
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {stations.map((station) => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  selectedStation?.id === station.id
                    ? 'bg-primary-500/20 border border-primary-500/50'
                    : 'bg-dark-800 hover:bg-dark-700 border border-transparent'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedStation?.id === station.id ? 'bg-primary-400' : 'bg-dark-500'
                  }`}
                />
                <span className="text-dark-200">{station.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-xl font-semibold text-dark-100">
              Kargo Bilgileri
            </h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {selectedStation && (
            <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <p className="text-dark-400 text-sm">Seçilen İstasyon</p>
              <p className="text-primary-400 font-semibold text-lg">{selectedStation.name}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4" />
                Gönderici Adı *
              </label>
              <input
                type="text"
                name="sender_name"
                value={formData.sender_name}
                onChange={handleChange}
                className="input"
                placeholder="Ad Soyad"
                required
              />
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefon Numarası *
              </label>
              <input
                type="tel"
                name="sender_phone"
                value={formData.sender_phone}
                onChange={handleChange}
                className="input"
                placeholder="05XX XXX XX XX"
                required
              />
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Ağırlık (kg) *
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="input"
                placeholder="10"
                min="0.1"
                step="0.1"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedStation}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Kargo Oluştur
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

