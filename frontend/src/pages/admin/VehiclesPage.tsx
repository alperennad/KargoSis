import { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { vehiclesAPI } from '../../services/api';
import type { Vehicle } from '../../types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    capacity: '',
    fuel_consumption: '0.15',
    is_rented: false,
    rental_cost: '0',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchVehicles = async () => {
    try {
      const data = await vehiclesAPI.getAll();
      setVehicles(data);
    } catch (error) {
      console.error('Araçlar alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plate_number: vehicle.plate_number,
        capacity: vehicle.capacity.toString(),
        fuel_consumption: vehicle.fuel_consumption.toString(),
        is_rented: vehicle.is_rented,
        rental_cost: vehicle.rental_cost.toString(),
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        plate_number: '',
        capacity: '',
        fuel_consumption: '0.15',
        is_rented: false,
        rental_cost: '0',
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const data = {
        plate_number: formData.plate_number,
        capacity: parseFloat(formData.capacity),
        fuel_consumption: parseFloat(formData.fuel_consumption),
        is_rented: formData.is_rented,
        rental_cost: formData.is_rented ? parseFloat(formData.rental_cost) : 0,
      };

      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle.id, data);
      } else {
        await vehiclesAPI.create(data);
      }

      await fetchVehicles();
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

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`${vehicle.plate_number} plakalı aracı silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await vehiclesAPI.delete(vehicle.id);
      await fetchVehicles();
    } catch (error) {
      console.error('Silme hatası:', error);
    }
  };

  const totalCapacity = vehicles.reduce((acc, v) => acc + v.capacity, 0);
  const availableCount = vehicles.filter((v) => v.is_available).length;

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
          <h1 className="font-display text-3xl font-bold text-dark-50">Araçlar</h1>
          <p className="text-dark-400 mt-1">Kargo araçlarını yönetin</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Araç
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Toplam Araç</p>
            <p className="font-display text-3xl font-bold text-dark-50">{vehicles.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Müsait</p>
            <p className="font-display text-3xl font-bold text-accent-400">{availableCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="relative z-10">
            <p className="text-dark-400 text-sm">Toplam Kapasite</p>
            <p className="font-display text-3xl font-bold text-primary-400">{totalCapacity} kg</p>
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className={`card ${
              !vehicle.is_available ? 'border-yellow-500/30 bg-yellow-500/5' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  vehicle.is_rented
                    ? 'bg-yellow-500/20'
                    : vehicle.is_available
                    ? 'bg-accent-500/20'
                    : 'bg-dark-700'
                }`}
              >
                <Truck
                  className={`w-6 h-6 ${
                    vehicle.is_rented
                      ? 'text-yellow-400'
                      : vehicle.is_available
                      ? 'text-accent-400'
                      : 'text-dark-400'
                  }`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(vehicle)}
                  className="p-2 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(vehicle)}
                  className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-mono text-xl text-dark-100 mb-2">{vehicle.plate_number}</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-400">Kapasite</span>
                <span className="text-dark-100">{vehicle.capacity} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Yakıt Tüketimi</span>
                <span className="text-dark-100">{vehicle.fuel_consumption} L/km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Durum</span>
                <span
                  className={`badge ${vehicle.is_available ? 'badge-success' : 'badge-warning'}`}
                >
                  {vehicle.is_available ? 'Müsait' : 'Kullanımda'}
                </span>
              </div>
              {vehicle.is_rented && (
                <div className="flex justify-between">
                  <span className="text-dark-400">Kiralama</span>
                  <span className="text-yellow-400">{vehicle.rental_cost} ₺</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <Truck className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-dark-300 mb-2">
              Araç Bulunamadı
            </h3>
            <p className="text-dark-500 mb-6">Henüz araç eklenmemiş.</p>
            <button onClick={() => openModal()} className="btn-primary">
              İlk Aracı Ekle
            </button>
          </div>
        )}
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
              {editingVehicle ? 'Araç Düzenle' : 'Yeni Araç'}
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Plaka</label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  className="input font-mono"
                  placeholder="41 ABC 123"
                  required
                />
              </div>

              <div>
                <label className="label">Kapasite (kg)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="input"
                  placeholder="500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="label">Yakıt Tüketimi (L/km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fuel_consumption}
                  onChange={(e) => setFormData({ ...formData, fuel_consumption: e.target.value })}
                  className="input"
                  placeholder="0.15"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_rented"
                  checked={formData.is_rented}
                  onChange={(e) => setFormData({ ...formData, is_rented: e.target.checked })}
                  className="w-4 h-4 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="is_rented" className="text-dark-200">
                  Kiralık Araç
                </label>
              </div>

              {formData.is_rented && (
                <div>
                  <label className="label">Kiralama Maliyeti</label>
                  <input
                    type="number"
                    value={formData.rental_cost}
                    onChange={(e) => setFormData({ ...formData, rental_cost: e.target.value })}
                    className="input"
                    placeholder="200"
                    min="0"
                  />
                </div>
              )}

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
                      {editingVehicle ? 'Güncelle' : 'Ekle'}
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

