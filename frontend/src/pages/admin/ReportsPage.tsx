import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Truck, Package } from 'lucide-react';
import { dashboardAPI } from '../../services/api';
import type { Trip, DashboardStats } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SummaryData {
  overall: {
    total_trips: number;
    total_distance: number;
    total_cost: number;
    total_cargo: number;
    total_weight: number;
    average_distance_per_trip: number;
    average_cost_per_trip: number;
  };
  daily: {
    date: string;
    trip_count: number;
    total_distance: number;
    total_cost: number;
    total_cargo: number;
    total_weight: number;
  }[];
}

const COLORS = ['#d4822e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, tripsData, summaryData] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getTrips(),
          dashboardAPI.getSummary(),
        ]);
        setStats(statsData);
        setTrips(tripsData);
        setSummary(summaryData);
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

  // Chart data
  const dailyData = summary?.daily?.map((d) => ({
    date: new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    sefer: d.trip_count,
    mesafe: d.total_distance,
    maliyet: d.total_cost,
    kargo: d.total_cargo,
  })) || [];

  const tripStatusData = [
    { name: 'Tamamlanan', value: trips.filter((t) => t.status === 'completed').length },
    { name: 'Devam Eden', value: trips.filter((t) => t.status === 'in_progress').length },
    { name: 'Başlayan', value: trips.filter((t) => t.status === 'started').length },
  ].filter((d) => d.value > 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50">Raporlar</h1>
        <p className="text-dark-400 mt-1">Sefer istatistikleri ve analizler</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Toplam Sefer</p>
              <p className="font-display text-3xl font-bold text-dark-50">
                {summary?.overall.total_trips || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Toplam Mesafe</p>
              <p className="font-display text-3xl font-bold text-blue-400">
                {summary?.overall.total_distance?.toFixed(0) || 0} km
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Toplam Maliyet</p>
              <p className="font-display text-3xl font-bold text-primary-400">
                {summary?.overall.total_cost?.toFixed(0) || 0} ₺
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Toplam Kargo</p>
              <p className="font-display text-3xl font-bold text-accent-400">
                {summary?.overall.total_cargo || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-accent-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Average Stats */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-dark-100 mb-4">
            Ortalama Değerler
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Sefer Başına Mesafe</span>
              <span className="text-dark-100 font-mono">
                {summary?.overall.average_distance_per_trip?.toFixed(1) || 0} km
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Sefer Başına Maliyet</span>
              <span className="text-primary-400 font-mono">
                {summary?.overall.average_cost_per_trip?.toFixed(0) || 0} ₺
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-800 rounded-lg">
              <span className="text-dark-400">Toplam Ağırlık</span>
              <span className="text-dark-100 font-mono">
                {summary?.overall.total_weight?.toFixed(1) || 0} kg
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-dark-100 mb-4">
            Sefer Durumu Dağılımı
          </h3>
          {tripStatusData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tripStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tripStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-dark-500">
              Henüz sefer verisi yok
            </div>
          )}
          <div className="flex justify-center gap-4 mt-4">
            {tripStatusData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-dark-400 text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {dailyData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily Trips Chart */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              Günlük Sefer Sayısı
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="sefer" fill="#d4822e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Cost Chart */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              Günlük Maliyet Trendi
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maliyet"
                    stroke="#d4822e"
                    strokeWidth={2}
                    dot={{ fill: '#d4822e', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Trips Table */}
      <div className="card mt-8">
        <h3 className="font-display text-lg font-semibold text-dark-100 mb-4">
          Son Seferler
        </h3>
        {trips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4">ID</th>
                  <th className="text-left p-4">Tarih</th>
                  <th className="text-left p-4">Durum</th>
                  <th className="text-right p-4">Mesafe</th>
                  <th className="text-right p-4">Maliyet</th>
                  <th className="text-right p-4">Kargo</th>
                  <th className="text-right p-4">Ağırlık</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 10).map((trip) => (
                  <tr key={trip.id} className="table-row">
                    <td className="p-4 font-mono text-dark-300">#{trip.id}</td>
                    <td className="p-4 text-dark-300">
                      {new Date(trip.start_time).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`badge ${
                          trip.status === 'completed'
                            ? 'badge-success'
                            : trip.status === 'in_progress'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {trip.status === 'completed'
                          ? 'Tamamlandı'
                          : trip.status === 'in_progress'
                          ? 'Devam Ediyor'
                          : 'Başladı'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-dark-300">
                      {trip.total_distance.toFixed(1)} km
                    </td>
                    <td className="p-4 text-right text-primary-400 font-mono">
                      {trip.total_cost.toFixed(0)} ₺
                    </td>
                    <td className="p-4 text-right text-dark-300">{trip.cargo_count}</td>
                    <td className="p-4 text-right text-dark-300">
                      {trip.total_weight.toFixed(1)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Truck className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">Henüz sefer kaydı yok</p>
          </div>
        )}
      </div>
    </div>
  );
}

