import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, MapPin, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cargosAPI, stationsAPI } from '../../services/api';
import type { Cargo, Station } from '../../types';
import MapComponent from '../../components/MapComponent';

export default function UserDashboard() {
  const { user } = useAuth();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cargosData, stationsData] = await Promise.all([
          cargosAPI.getAll(),
          stationsAPI.getAll(),
        ]);
        setCargos(cargosData);
        setStations(stationsData);
      } catch (error) {
        console.error('Veri alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentCargos = cargos.slice(0, 5);
  const pendingCount = cargos.filter((c) => c.status === 'pending').length;
  const deliveredCount = cargos.filter((c) => c.status === 'delivered').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50">
          Hoş Geldin, {user?.full_name || user?.username}!
        </h1>
        <p className="text-dark-400 mt-2">Kargo işlemlerini buradan yönetebilirsin.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/user/send"
          className="card group flex items-center gap-4 hover:border-primary-500/50"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-7 h-7 text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark-100 text-lg">Kargo Gönder</h3>
            <p className="text-dark-400 text-sm">Yeni kargo kaydı oluştur</p>
          </div>
          <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition-colors" />
        </Link>

        <Link
          to="/user/my-cargo"
          className="card group flex items-center gap-4 hover:border-primary-500/50"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Truck className="w-7 h-7 text-accent-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark-100 text-lg">Kargolarım</h3>
            <p className="text-dark-400 text-sm">Tüm kargolarını görüntüle</p>
          </div>
          <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-accent-400 transition-colors" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Toplam Kargo</p>
            <p className="font-display text-3xl font-bold text-dark-50">{cargos.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Beklemede</p>
            <p className="font-display text-3xl font-bold text-yellow-400">{pendingCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Teslim Edildi</p>
            <p className="font-display text-3xl font-bold text-accent-400">{deliveredCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">İstasyon Sayısı</p>
            <p className="font-display text-3xl font-bold text-primary-400">{stations.length}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Cargos */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-dark-100">Son Kargolar</h2>
            <Link to="/user/my-cargo" className="text-primary-400 text-sm hover:text-primary-300">
              Tümünü Gör
            </Link>
          </div>

          {recentCargos.length > 0 ? (
            <div className="space-y-3">
              {recentCargos.map((cargo) => (
                <div
                  key={cargo.id}
                  className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-lg"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      cargo.status === 'delivered'
                        ? 'bg-accent-500/20'
                        : cargo.status === 'pending'
                        ? 'bg-yellow-500/20'
                        : 'bg-blue-500/20'
                    }`}
                  >
                    {cargo.status === 'delivered' ? (
                      <CheckCircle className="w-5 h-5 text-accent-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-dark-100 truncate">{cargo.tracking_code}</p>
                    <p className="text-dark-400 text-sm">{cargo.station?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-dark-200">{cargo.weight} kg</p>
                    <p className="text-dark-500 text-xs">
                      {new Date(cargo.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">Henüz kargo göndermediniz</p>
              <Link to="/user/send" className="text-primary-400 text-sm mt-2 inline-block">
                İlk kargonuzu gönderin
              </Link>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-xl font-semibold text-dark-100">İstasyonlar</h2>
          </div>
          <div className="h-[350px] rounded-xl overflow-hidden">
            <MapComponent stations={stations} />
          </div>
        </div>
      </div>
    </div>
  );
}

