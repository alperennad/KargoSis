import { useState, useEffect } from 'react';
import { Route as RouteIcon, Truck, MapPin, Filter, Eye, Trash2, CheckCircle } from 'lucide-react';
import { routesAPI } from '../../services/api';
import type { Route } from '../../types';
import MapComponent from '../../components/MapComponent';

export default function AllRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const fetchRoutes = async () => {
    try {
      const data = await routesAPI.getAll();
      setRoutes(data);
    } catch (error) {
      console.error('Rotalar alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleStatusUpdate = async (routeId: number, newStatus: string) => {
    try {
      await routesAPI.updateStatus(routeId, newStatus);
      await fetchRoutes();
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
    }
  };

  const handleDelete = async (routeId: number) => {
    if (!confirm('Bu rotayı silmek istediğinize emin misiniz?')) return;
    
    try {
      await routesAPI.delete(routeId);
      await fetchRoutes();
      if (selectedRoute?.id === routeId) {
        setSelectedRoute(null);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
    }
  };

  const filteredRoutes = statusFilter === 'all' 
    ? routes 
    : routes.filter(r => r.status === statusFilter);

  const statusColors: Record<string, string> = {
    planned: 'badge-info',
    active: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-error',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Planlandı',
    active: 'Aktif',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-50">Tüm Rotalar</h1>
          <p className="text-dark-400 mt-1">Oluşturulan tüm sefer rotaları</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-dark-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="planned">Planlandı</option>
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Routes List */}
        <div className="space-y-4">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((route) => (
              <div
                key={route.id}
                className={`card cursor-pointer transition-all ${
                  selectedRoute?.id === route.id
                    ? 'border-primary-500/50 bg-primary-500/5'
                    : 'hover:border-dark-500'
                }`}
                onClick={() => setSelectedRoute(route)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                      <RouteIcon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-dark-100 font-medium">Rota #{route.id}</p>
                      <p className="text-dark-400 text-sm">
                        {route.vehicle?.plate_number || 'Araç atanmadı'}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${statusColors[route.status]}`}>
                    {statusLabels[route.status]}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-dark-500 text-xs">Mesafe</p>
                    <p className="text-dark-100">{route.total_distance.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-xs">Maliyet</p>
                    <p className="text-primary-400">{route.total_cost.toFixed(0)} ₺</p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-xs">Kargo</p>
                    <p className="text-dark-100">{route.cargo_count} adet</p>
                  </div>
                </div>

                {route.stops && route.stops.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {route.stops.slice(0, 5).map((stop, i) => (
                      <span
                        key={stop.id}
                        className="px-2 py-0.5 bg-dark-700 rounded text-dark-300 text-xs"
                      >
                        {i + 1}. {stop.station.name}
                      </span>
                    ))}
                    {route.stops.length > 5 && (
                      <span className="px-2 py-0.5 text-dark-400 text-xs">
                        +{route.stops.length - 5} durak
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-dark-700">
                  {route.status === 'planned' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(route.id, 'active');
                        }}
                        className="flex-1 btn-secondary text-sm py-2"
                      >
                        Başlat
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(route.id);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {route.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(route.id, 'completed');
                      }}
                      className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Tamamla
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <RouteIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-dark-300 mb-2">
                Rota Bulunamadı
              </h3>
              <p className="text-dark-500">
                {statusFilter !== 'all'
                  ? 'Bu durumda rota yok'
                  : 'Henüz rota oluşturulmamış'}
              </p>
            </div>
          )}
        </div>

        {/* Map & Details */}
        <div className="card sticky top-4">
          {selectedRoute ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-semibold text-dark-100">
                  Rota #{selectedRoute.id} Detayları
                </h3>
                <span className={`badge ${statusColors[selectedRoute.status]}`}>
                  {statusLabels[selectedRoute.status]}
                </span>
              </div>

              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-dark-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-primary-400" />
                    <span className="text-dark-400 text-sm">Araç</span>
                  </div>
                  <p className="font-mono text-dark-100">{selectedRoute.vehicle?.plate_number}</p>
                  <p className="text-dark-500 text-sm">{selectedRoute.vehicle?.capacity} kg kapasite</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <span className="text-dark-400 text-sm">Duraklar</span>
                  </div>
                  <p className="text-dark-100">{selectedRoute.stops?.length || 0} durak</p>
                  <p className="text-dark-500 text-sm">{selectedRoute.total_distance.toFixed(1)} km</p>
                </div>
              </div>

              {/* Map */}
              {selectedRoute.stops && selectedRoute.stops.length > 0 && (
                <div className="h-[400px] rounded-xl overflow-hidden mb-4">
                  <MapComponent
                    stations={selectedRoute.stops.map(s => s.station)}
                    routes={[selectedRoute]}
                  />
                </div>
              )}

              {/* Stops List */}
              {selectedRoute.stops && (
                <div>
                  <h4 className="font-medium text-dark-100 mb-3">Güzergah Sırası</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-accent-500/10 rounded-lg">
                      <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center text-xs text-white">
                        S
                      </div>
                      <span className="text-dark-100">Kocaeli Üniversitesi (Başlangıç)</span>
                    </div>
                    
                    {selectedRoute.stops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                        <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-xs text-primary-400">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-dark-100">{stop.station.name}</span>
                          {(stop.cargo_count > 0 || stop.cargo_weight > 0) && (
                            <span className="text-dark-400 text-sm ml-2">
                              ({stop.cargo_count} kargo, {stop.cargo_weight.toFixed(1)} kg)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-center gap-3 p-3 bg-accent-500/10 rounded-lg">
                      <div className="w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center text-xs text-white">
                        B
                      </div>
                      <span className="text-dark-100">Kocaeli Üniversitesi (Bitiş)</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <Eye className="w-16 h-16 text-dark-600 mb-4" />
              <h3 className="font-display text-xl font-semibold text-dark-300 mb-2">
                Rota Seçin
              </h3>
              <p className="text-dark-500">
                Detayları görüntülemek için soldaki listeden bir rota seçin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

