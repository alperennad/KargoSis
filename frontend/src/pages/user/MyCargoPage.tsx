import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, Clock, Truck, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { cargosAPI } from '../../services/api';
import type { Cargo, CargoStatus } from '../../types';

const statusConfig: Record<CargoStatus, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'Beklemede', color: 'badge-warning', icon: Clock },
  assigned: { label: 'Araca Atandı', color: 'badge-info', icon: Truck },
  in_transit: { label: 'Yolda', color: 'badge-info', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'badge-error', icon: XCircle },
};

export default function MyCargoPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [filteredCargos, setFilteredCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchCargos = async () => {
      try {
        const data = await cargosAPI.getAll();
        setCargos(data);
        setFilteredCargos(data);
      } catch (error) {
        console.error('Kargolar alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCargos();
  }, []);

  useEffect(() => {
    let result = cargos;

    if (searchTerm) {
      result = result.filter(
        (cargo) =>
          cargo.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cargo.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((cargo) => cargo.status === statusFilter);
    }

    setFilteredCargos(result);
  }, [searchTerm, statusFilter, cargos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-50">Kargolarım</h1>
          <p className="text-dark-400 mt-1">Tüm kargo kayıtlarınız</p>
        </div>
        <Link to="/user/send" className="btn-primary">
          <Package className="w-5 h-5 mr-2" />
          Yeni Kargo
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12"
              placeholder="Takip kodu veya gönderici adı ara..."
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="assigned">Araca Atandı</option>
              <option value="in_transit">Yolda</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cargo List */}
      {filteredCargos.length > 0 ? (
        <div className="grid gap-4">
          {filteredCargos.map((cargo) => {
            const status = statusConfig[cargo.status];
            return (
              <div
                key={cargo.id}
                className="card hover:border-primary-500/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Status Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      cargo.status === 'delivered'
                        ? 'bg-accent-500/20'
                        : cargo.status === 'cancelled'
                        ? 'bg-red-500/20'
                        : cargo.status === 'pending'
                        ? 'bg-yellow-500/20'
                        : 'bg-blue-500/20'
                    }`}
                  >
                    <status.icon
                      className={`w-6 h-6 ${
                        cargo.status === 'delivered'
                          ? 'text-accent-400'
                          : cargo.status === 'cancelled'
                          ? 'text-red-400'
                          : cargo.status === 'pending'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-mono text-lg text-dark-100">{cargo.tracking_code}</p>
                      <span className={`badge ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {cargo.station?.name || 'Bilinmiyor'}
                      </span>
                      <span>{cargo.weight} kg</span>
                      <span>
                        {new Date(cargo.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/track?code=${cargo.tracking_code}`}
                      className="btn-outline text-sm py-2"
                    >
                      Takip Et
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-dark-300 mb-2">
            Kargo Bulunamadı
          </h3>
          <p className="text-dark-500 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Arama kriterlerinize uygun kargo bulunamadı.'
              : 'Henüz hiç kargo göndermediniz.'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Link to="/user/send" className="btn-primary">
              İlk Kargonuzu Gönderin
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

