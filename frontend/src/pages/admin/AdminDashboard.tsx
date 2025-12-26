import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Truck, Package, Route, TrendingUp, 
  DollarSign, Calendar, ArrowUpRight 
} from 'lucide-react';
import { dashboardAPI, stationsAPI } from '../../services/api';
import type { DashboardStats, Station } from '../../types';
import MapComponent from '../../components/MapComponent';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, stationsData] = await Promise.all([
          dashboardAPI.getStats(),
          stationsAPI.getWithCargo(),
        ]);
        setStats(statsData);
        setStations(stationsData);
      } catch (error) {
        console.error('Veri alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Toplam İstasyon',
      value: stats?.total_stations || 0,
      icon: MapPin,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/stations',
    },
    {
      label: 'Bekleyen Kargo',
      value: stats?.pending_cargos || 0,
      icon: Package,
      color: 'from-yellow-500 to-orange-500',
      link: '/admin/route-planning',
    },
    {
      label: 'Müsait Araç',
      value: `${stats?.available_vehicles || 0}/${stats?.total_vehicles || 0}`,
      icon: Truck,
      color: 'from-accent-500 to-accent-600',
      link: '/admin/vehicles',
    },
    {
      label: 'Aktif Rota',
      value: stats?.active_routes || 0,
      icon: Route,
      color: 'from-primary-500 to-primary-600',
      link: '/admin/routes',
    },
    {
      label: 'Toplam Sefer',
      value: stats?.total_trips || 0,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/reports',
    },
    {
      label: 'Bugünkü Maliyet',
      value: `${stats?.total_cost_today?.toFixed(0) || 0} ₺`,
      icon: DollarSign,
      color: 'from-red-500 to-pink-500',
      link: '/admin/reports',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50">Dashboard</h1>
        <p className="text-dark-400 mt-1">Sistem genel bakış</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-stagger">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="stat-card group hover:border-primary-500/30 transition-colors"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-dark-400 text-sm mb-1">{stat.label}</p>
                <p className="font-display text-3xl font-bold text-dark-50">{stat.value}</p>
              </div>
              <div
                className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center opacity-80 group-hover:scale-110 transition-transform`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="w-5 h-5 text-primary-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Map */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-dark-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-400" />
              İstasyon Haritası
            </h2>
            <Link to="/admin/stations" className="text-primary-400 text-sm hover:text-primary-300">
              Tümünü Gör
            </Link>
          </div>
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapComponent stations={stations} />
          </div>
        </div>

        {/* Stations with Cargo */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-dark-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-400" />
              İstasyon Kargo Durumu
            </h2>
            <Link to="/admin/route-planning" className="text-primary-400 text-sm hover:text-primary-300">
              Rota Planla
            </Link>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {stations
              .filter((s) => !s.is_headquarters && (s.cargo_count || 0) > 0)
              .sort((a, b) => (b.cargo_count || 0) - (a.cargo_count || 0))
              .map((station) => (
                <div
                  key={station.id}
                  className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-dark-100 font-medium">{station.name}</p>
                    <p className="text-dark-400 text-sm">
                      {station.cargo_count} kargo, {station.total_weight?.toFixed(1)} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                        style={{
                          width: `${Math.min(100, ((station.total_weight || 0) / 200) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

            {stations.filter((s) => !s.is_headquarters && (s.cargo_count || 0) > 0).length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">Bekleyen kargo yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Link
          to="/admin/route-planning"
          className="card group flex items-center gap-4 hover:border-primary-500/50"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Route className="w-7 h-7 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-100 text-lg">Rota Planla</h3>
            <p className="text-dark-400 text-sm">Yeni sefer oluştur</p>
          </div>
        </Link>

        <Link
          to="/admin/stations"
          className="card group flex items-center gap-4 hover:border-accent-500/50"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <MapPin className="w-7 h-7 text-accent-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-100 text-lg">İstasyon Ekle</h3>
            <p className="text-dark-400 text-sm">Yeni istasyon tanımla</p>
          </div>
        </Link>

        <Link
          to="/admin/reports"
          className="card group flex items-center gap-4 hover:border-blue-500/50"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Calendar className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-100 text-lg">Raporlar</h3>
            <p className="text-dark-400 text-sm">Özet ve grafikler</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

