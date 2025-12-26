import { useState } from 'react';
import { Search, Package, MapPin, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cargosAPI, routesAPI } from '../services/api';
import type { Cargo, Route } from '../types';
import MapComponent from '../components/MapComponent';

const statusInfo: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'Beklemede', color: 'badge-warning', icon: Clock },
  assigned: { label: 'Araca Atandı', color: 'badge-info', icon: Truck },
  in_transit: { label: 'Yolda', color: 'badge-info', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'badge-error', icon: AlertCircle },
};

export default function TrackCargoPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const [cargo, setCargo] = useState<Cargo | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;

    setLoading(true);
    setError('');
    setCargo(null);
    setRoute(null);
    setSearched(true);

    try {
      const cargoData = await cargosAPI.track(trackingCode.trim().toUpperCase());
      setCargo(cargoData);

      // Eğer kargo bir rotaya atandıysa, rotayı da getir
      if (cargoData.assigned_route_id) {
        try {
          const routeData = await routesAPI.getByCargoTracking(trackingCode.trim().toUpperCase());
          setRoute(routeData);
        } catch {
          // Rota bulunamazsa hata verme
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError('Bu takip koduna ait kargo bulunamadı');
        } else {
          setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        }
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const status = cargo ? statusInfo[cargo.status] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-primary-400" />
        </div>
        <h1 className="font-display text-4xl font-bold text-dark-50 mb-4">Kargo Takip</h1>
        <p className="text-dark-400">Takip kodunuzu girerek kargonuzun durumunu öğrenin</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-12 animate-slide-up">
        <div className="card-elevated">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="input pl-12 text-lg font-mono"
                placeholder="Örn: KRG251226ABCD"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !trackingCode.trim()}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sorgula'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-4 text-red-400 animate-fade-in">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {/* Result */}
      {cargo && (
        <div className="space-y-6 animate-slide-up">
          {/* Status Card */}
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-dark-400 text-sm">Takip Kodu</p>
                <p className="font-mono text-2xl text-dark-50">{cargo.tracking_code}</p>
              </div>
              {status && (
                <div className={`badge ${status.color} text-lg px-4 py-2`}>
                  <status.icon className="w-5 h-5 mr-2" />
                  {status.label}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-dark-400 text-sm">Gönderici</p>
                  <p className="text-dark-100">{cargo.sender_name}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Telefon</p>
                  <p className="text-dark-100">{cargo.sender_phone}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-dark-400 text-sm">Çıkış İstasyonu</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <p className="text-dark-100">{cargo.station?.name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Ağırlık</p>
                  <p className="text-dark-100">{cargo.weight} kg</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-dark-700">
              <p className="text-dark-400 text-sm">Oluşturulma Tarihi</p>
              <p className="text-dark-100">
                {new Date(cargo.created_at).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Route Map */}
          {route && route.stops && route.stops.length > 0 && (
            <div className="card-elevated">
              <h3 className="font-display text-xl font-semibold text-dark-50 mb-4">
                <Truck className="inline-block w-5 h-5 mr-2 text-primary-400" />
                Teslimat Rotası
              </h3>
              
              <div className="mb-4 p-4 bg-dark-800 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-dark-400 text-sm">Araç</p>
                    <p className="text-dark-100 font-mono">{route.vehicle?.plate_number}</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm">Toplam Mesafe</p>
                    <p className="text-dark-100">{route.total_distance.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm">Durak Sayısı</p>
                    <p className="text-dark-100">{route.stops.length}</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm">Durum</p>
                    <p className="text-primary-400 capitalize">{route.status}</p>
                  </div>
                </div>
              </div>

              <div className="h-[400px] rounded-xl overflow-hidden">
                <MapComponent
                  stations={route.stops.map(stop => stop.station)}
                  routes={[route]}
                  highlightStationId={cargo.station_id}
                />
              </div>

              {/* Stops List */}
              <div className="mt-4">
                <p className="text-dark-400 text-sm mb-2">Güzergah Sırası:</p>
                <div className="flex flex-wrap gap-2">
                  {route.stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        stop.station_id === cargo.station_id
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-800 text-dark-300'
                      }`}
                    >
                      <span className="w-5 h-5 bg-dark-700 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      {stop.station.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {searched && !cargo && !error && !loading && (
        <div className="text-center py-12 animate-fade-in">
          <Package className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">Kargo bulunamadı</p>
        </div>
      )}
    </div>
  );
}

