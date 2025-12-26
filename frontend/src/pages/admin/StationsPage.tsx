import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, X, Check, Package } from 'lucide-react';
import { stationsAPI } from '../../services/api';
import type { Station } from '../../types';
import MapComponent from '../../components/MapComponent';

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchStations = async () => {
    try {
      const data = await stationsAPI.getWithCargo();
      setStations(data);
    } catch (error) {
      console.error('İstasyonlar alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const openModal = (station?: Station) => {
    if (station) {
      setEditingStation(station);
      setFormData({
        name: station.name,
        latitude: station.latitude.toString(),
        longitude: station.longitude.toString(),
      });
    } else {
      setEditingStation(null);
      setFormData({ name: '', latitude: '', longitude: '' });
    }
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStation(null);
    setFormData({ name: '', latitude: '', longitude: '' });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const data = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        is_headquarters: false,
      };

      if (editingStation) {
        await stationsAPI.update(editingStation.id, data);
      } else {
        await stationsAPI.create(data);
      }

      await fetchStations();
      closeModal();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setFormError(axiosError.response?.data?.detail || 'İşlem başarısız');
      } else {
        setFormError('İşlem başarısız');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (station: Station) => {
    if (!confirm(`${station.name} istasyonunu silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await stationsAPI.delete(station.id);
      await fetchStations();
    } catch (error) {
      console.error('Silme hatası:', error);
    }
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
          <h1 className="font-display text-3xl font-bold text-dark-50">İstasyonlar</h1>
          <p className="text-dark-400 mt-1">Kargo toplama istasyonlarını yönetin</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Yeni İstasyon
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Map */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-dark-100 mb-4">Harita</h2>
          <div className="h-[500px] rounded-xl overflow-hidden">
            <MapComponent stations={stations} />
          </div>
        </div>

        {/* Station List */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-dark-100 mb-4">
            İstasyon Listesi ({stations.length})
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {stations.map((station) => (
              <div
                key={station.id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  station.is_headquarters
                    ? 'bg-accent-500/10 border border-accent-500/30'
                    : 'bg-dark-800/50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    station.is_headquarters ? 'bg-accent-500/20' : 'bg-primary-500/20'
                  }`}
                >
                  <MapPin
                    className={`w-5 h-5 ${
                      station.is_headquarters ? 'text-accent-400' : 'text-primary-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-dark-100 font-medium truncate">
                    {station.name}
                    {station.is_headquarters && (
                      <span className="ml-2 badge badge-success text-xs">Merkez</span>
                    )}
                  </p>
                  <p className="text-dark-500 text-xs">
                    {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                  </p>
                  {!station.is_headquarters && (station.cargo_count || 0) > 0 && (
                    <p className="text-dark-400 text-sm flex items-center gap-1 mt-1">
                      <Package className="w-3 h-3" />
                      {station.cargo_count} kargo, {station.total_weight?.toFixed(1)} kg
                    </p>
                  )}
                </div>
                {!station.is_headquarters && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(station)}
                      className="p-2 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(station)}
                      className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-dark-400 hover:text-dark-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display text-2xl font-bold text-dark-50 mb-6">
              {editingStation ? 'İstasyon Düzenle' : 'Yeni İstasyon'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">İstasyon Adı</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Örn: Başiskele"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Enlem (Latitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="input"
                    placeholder="40.7167"
                    required
                  />
                </div>
                <div>
                  <label className="label">Boylam (Longitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="input"
                    placeholder="29.9167"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-secondary">
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {editingStation ? 'Güncelle' : 'Ekle'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

