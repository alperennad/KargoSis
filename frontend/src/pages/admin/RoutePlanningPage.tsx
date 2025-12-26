import { useState, useEffect, useCallback } from 'react';
import { 
  Route, Play, Settings, Truck, MapPin, Package, 
  AlertCircle, CheckCircle, ArrowRight, Calculator, TrendingDown
} from 'lucide-react';
import { stationsAPI, optimizationAPI, vehiclesAPI } from '../../services/api';
import type { Station, OptimizationResult, Scenario, StationCargoInput, Vehicle } from '../../types';
import MapComponent from '../../components/MapComponent';

interface CostEstimate {
  unlimited: { cost: number; vehicles: number; rented: number } | null;
  limited: { cost: number; vehicles: number; rejected: number } | null;
  loading: boolean;
}

export default function RoutePlanningPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]); // Merkez dahil tüm istasyonlar
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Mevcut araçlar
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Form state
  const [problemType, setProblemType] = useState<'unlimited' | 'limited'>('unlimited');
  const [stationInputs, setStationInputs] = useState<Record<number, { cargo_count: number; total_weight: number }>>({});
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tahmini maliyet karşılaştırması
  const [costEstimate, setCostEstimate] = useState<CostEstimate>({
    unlimited: null,
    limited: null,
    loading: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stationsData, scenariosData, vehiclesData] = await Promise.all([
          stationsAPI.getWithCargo(),
          optimizationAPI.getScenarios(),
          vehiclesAPI.getAll(),
        ]);
        setAllStations(stationsData); // Tüm istasyonlar (harita için)
        setStations(stationsData.filter(s => !s.is_headquarters)); // Kargo girişi için
        setScenarios(scenariosData);
        setVehicles(vehiclesData.filter(v => v.is_available && !v.is_rented)); // Müsait ve sahip olunan araçlar
        
        // Mevcut kargo verilerini yükle
        const inputs: Record<number, { cargo_count: number; total_weight: number }> = {};
        stationsData.forEach(s => {
          if (!s.is_headquarters) {
            inputs[s.id] = {
              cargo_count: s.cargo_count || 0,
              total_weight: s.total_weight || 0,
            };
          }
        });
        setStationInputs(inputs);
      } catch (error) {
        console.error('Veri alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Tahmini maliyet hesaplama (debounce ile)
  const calculateEstimates = useCallback(async (inputs: Record<number, { cargo_count: number; total_weight: number }>) => {
    const stationData: StationCargoInput[] = Object.entries(inputs)
      .filter(([_, data]) => data.cargo_count > 0 || data.total_weight > 0)
      .map(([stationId, data]) => ({
        station_id: parseInt(stationId),
        cargo_count: data.cargo_count,
        total_weight: data.total_weight,
      }));

    if (stationData.length === 0) {
      setCostEstimate({ unlimited: null, limited: null, loading: false });
      return;
    }

    setCostEstimate(prev => ({ ...prev, loading: true }));

    try {
      // Her iki problem türü için paralel hesaplama
      const [unlimitedResult, limitedResult] = await Promise.all([
        optimizationAPI.calculate(stationData, 'unlimited').catch(() => null),
        optimizationAPI.calculate(stationData, 'limited').catch(() => null),
      ]);

      setCostEstimate({
        unlimited: unlimitedResult ? {
          cost: unlimitedResult.total_cost,
          vehicles: unlimitedResult.vehicles_used,
          rented: unlimitedResult.rented_vehicles,
        } : null,
        limited: limitedResult ? {
          cost: limitedResult.total_cost,
          vehicles: limitedResult.vehicles_used,
          rejected: limitedResult.rejected_cargos.length,
        } : null,
        loading: false,
      });
    } catch {
      setCostEstimate(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Senaryo yüklendiğinde veya veriler değiştiğinde maliyet tahmini yap
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasData = Object.values(stationInputs).some(s => s.cargo_count > 0 || s.total_weight > 0);
      if (hasData) {
        calculateEstimates(stationInputs);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [stationInputs, calculateEstimates]);

  const loadScenario = (scenario: Scenario) => {
    const newInputs: Record<number, { cargo_count: number; total_weight: number }> = {};
    
    // Tüm istasyonları sıfırla
    stations.forEach(s => {
      newInputs[s.id] = { cargo_count: 0, total_weight: 0 };
    });
    
    // Senaryo verilerini yükle
    scenario.stations.forEach(scenarioStation => {
      const station = stations.find(s => s.name === scenarioStation.station_name);
      if (station) {
        newInputs[station.id] = {
          cargo_count: scenarioStation.cargo_count,
          total_weight: scenarioStation.total_weight,
        };
      }
    });
    
    setStationInputs(newInputs);
    setResult(null);
    setError('');
    setCostEstimate({ unlimited: null, limited: null, loading: false });
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setResult(null);

    try {
      const stationData: StationCargoInput[] = Object.entries(stationInputs)
        .filter(([_, data]) => data.cargo_count > 0 || data.total_weight > 0)
        .map(([stationId, data]) => ({
          station_id: parseInt(stationId),
          cargo_count: data.cargo_count,
          total_weight: data.total_weight,
        }));

      if (stationData.length === 0) {
        setError('En az bir istasyona kargo girişi yapmalısınız');
        return;
      }

      const optimizationResult = await optimizationAPI.calculate(stationData, problemType);
      setResult(optimizationResult);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Hesaplama başarısız');
      } else {
        setError('Hesaplama başarısız');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    
    setApplying(true);
    setError('');
    setSuccess('');

    try {
      const stationData: StationCargoInput[] = Object.entries(stationInputs)
        .filter(([_, data]) => data.cargo_count > 0 || data.total_weight > 0)
        .map(([stationId, data]) => ({
          station_id: parseInt(stationId),
          cargo_count: data.cargo_count,
          total_weight: data.total_weight,
        }));

      await optimizationAPI.apply(stationData, problemType);
      setSuccess('Rotalar başarıyla oluşturuldu ve veritabanına kaydedildi!');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || 'Uygulama başarısız');
      } else {
        setError('Uygulama başarısız');
      }
    } finally {
      setApplying(false);
    }
  };

  const totalCargo = Object.values(stationInputs).reduce((acc, s) => acc + s.cargo_count, 0);
  const totalWeight = Object.values(stationInputs).reduce((acc, s) => acc + s.total_weight, 0);
  
  // Mevcut araç kapasitesini veritabanından dinamik olarak hesapla
  const totalVehicleCapacity = vehicles.reduce((acc, v) => acc + v.capacity, 0);
  
  // Kapasite aşıldığında "belirli sayıda araç" seçeneği devre dışı
  const isLimitedDisabled = totalWeight > totalVehicleCapacity;
  
  // Eğer kapasite aşıldıysa ve "limited" seçiliyse, otomatik olarak "unlimited"a geç
  useEffect(() => {
    if (isLimitedDisabled && problemType === 'limited') {
      setProblemType('unlimited');
    }
  }, [isLimitedDisabled, problemType]);

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
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-dark-50">Rota Planlama</h1>
        <p className="text-dark-400 mt-1">
          Optimal rota hesaplama ve sefer oluşturma
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg flex items-center gap-3 text-accent-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Configuration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Problem Type */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-400" />
              Problem Türü
            </h3>
            
            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  problemType === 'unlimited'
                    ? 'bg-primary-500/10 border border-primary-500/50'
                    : 'bg-dark-800 hover:bg-dark-700'
                }`}
              >
                <input
                  type="radio"
                  name="problemType"
                  value="unlimited"
                  checked={problemType === 'unlimited'}
                  onChange={() => setProblemType('unlimited')}
                  className="w-4 h-4 text-primary-500"
                />
                <div>
                  <p className="text-dark-100 font-medium">Sınırsız Araç</p>
                  <p className="text-dark-400 text-sm">Gerekirse araç kirala</p>
                </div>
              </label>
              
              <label
                className={`flex items-center gap-3 p-4 rounded-lg transition-colors ${
                  isLimitedDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-dark-800'
                    : problemType === 'limited'
                      ? 'bg-primary-500/10 border border-primary-500/50 cursor-pointer'
                      : 'bg-dark-800 hover:bg-dark-700 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="problemType"
                  value="limited"
                  checked={problemType === 'limited'}
                  onChange={() => !isLimitedDisabled && setProblemType('limited')}
                  disabled={isLimitedDisabled}
                  className="w-4 h-4 text-primary-500 disabled:opacity-50"
                />
                <div>
                  <p className={`font-medium ${isLimitedDisabled ? 'text-dark-500' : 'text-dark-100'}`}>
                    Belirli Sayıda Araç
                  </p>
                  <p className={`text-sm ${isLimitedDisabled ? 'text-dark-600' : 'text-dark-400'}`}>
                    {isLimitedDisabled 
                      ? `Kapasite yetersiz (${totalWeight.toFixed(0)} > ${totalVehicleCapacity} kg)`
                      : 'Mevcut araçlarla'
                    }
                  </p>
                </div>
              </label>
            </div>
            
            {/* Kapasite uyarısı */}
            {isLimitedDisabled && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Toplam ağırlık ({totalWeight.toFixed(0)} kg) mevcut kapasitenin ({totalVehicleCapacity} kg) üzerinde. Ek araç kiralanması gerekli.
                </p>
              </div>
            )}

            {/* Maliyet Karşılaştırma Paneli */}
            {(costEstimate.unlimited || costEstimate.limited || costEstimate.loading) && (
              <div className="mt-4 p-4 bg-dark-800 rounded-lg border border-dark-600">
                <h4 className="text-dark-100 font-medium mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary-400" />
                  Tahmini Maliyet Karşılaştırması
                </h4>
                
                {costEstimate.loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                    <span className="ml-2 text-dark-400 text-sm">Hesaplanıyor...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sınırsız Araç */}
                    <div 
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        problemType === 'unlimited' 
                          ? 'bg-primary-500/20 border border-primary-500/50' 
                          : 'bg-dark-700 hover:bg-dark-600'
                      }`}
                      onClick={() => setProblemType('unlimited')}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-dark-200 text-sm">Sınırsız Araç</span>
                        {costEstimate.unlimited && (
                          <span className="font-mono text-lg text-primary-400 font-bold">
                            {costEstimate.unlimited.cost.toFixed(0)} ₺
                          </span>
                        )}
                      </div>
                      {costEstimate.unlimited && (
                        <div className="text-dark-400 text-xs mt-1">
                          {costEstimate.unlimited.vehicles} araç
                          {costEstimate.unlimited.rented > 0 && (
                            <span className="text-yellow-400"> (+{costEstimate.unlimited.rented} kiralık)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Belirli Sayıda Araç */}
                    <div 
                      className={`p-3 rounded-lg transition-all ${
                        isLimitedDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-dark-700' 
                          : problemType === 'limited'
                            ? 'bg-primary-500/20 border border-primary-500/50 cursor-pointer'
                            : 'bg-dark-700 hover:bg-dark-600 cursor-pointer'
                      }`}
                      onClick={() => !isLimitedDisabled && setProblemType('limited')}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${isLimitedDisabled ? 'text-dark-500' : 'text-dark-200'}`}>
                          Belirli Sayıda Araç
                        </span>
                        {costEstimate.limited && !isLimitedDisabled && (
                          <span className="font-mono text-lg text-primary-400 font-bold">
                            {costEstimate.limited.cost.toFixed(0)} ₺
                          </span>
                        )}
                        {isLimitedDisabled && (
                          <span className="text-dark-500 text-sm">Kapasite yetersiz</span>
                        )}
                      </div>
                      {costEstimate.limited && !isLimitedDisabled && (
                        <div className="text-dark-400 text-xs mt-1">
                          {costEstimate.limited.vehicles} araç
                          {costEstimate.limited.rejected > 0 && (
                            <span className="text-red-400"> ({costEstimate.limited.rejected} kargo reddedildi)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* En ucuz göstergesi */}
                    {costEstimate.unlimited && costEstimate.limited && !isLimitedDisabled && (
                      <div className={`p-2 rounded-lg text-center text-sm ${
                        costEstimate.unlimited.cost <= costEstimate.limited.cost
                          ? 'bg-accent-500/10 text-accent-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        <TrendingDown className="w-4 h-4 inline mr-1" />
                        {costEstimate.unlimited.cost <= costEstimate.limited.cost
                          ? `Sınırsız Araç ${(costEstimate.limited.cost - costEstimate.unlimited.cost).toFixed(0)} ₺ daha ucuz`
                          : `Belirli Sayıda Araç ${(costEstimate.unlimited.cost - costEstimate.limited.cost).toFixed(0)} ₺ daha ucuz`
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scenarios */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4">
              Örnek Senaryolar
            </h3>
            <div className="space-y-2">
              {scenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={() => loadScenario(scenario)}
                  className="w-full text-left p-3 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <p className="text-dark-100 font-medium">{scenario.name}</p>
                  <p className="text-dark-400 text-sm">{scenario.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4">
              Özet
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Toplam Kargo</span>
                <span className="text-dark-100 font-mono">{totalCargo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Toplam Ağırlık</span>
                <span className={`font-mono ${isLimitedDisabled ? 'text-yellow-400' : 'text-dark-100'}`}>
                  {totalWeight.toFixed(1)} kg
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Mevcut Kapasite</span>
                <span className="text-accent-400 font-mono">{totalVehicleCapacity} kg</span>
              </div>
              {/* Araç kapasiteleri detayı */}
              {vehicles.length > 0 && (
                <div className="mt-2 pt-2 border-t border-dark-700">
                  <p className="text-dark-500 text-xs mb-1">Araç Kapasiteleri:</p>
                  <div className="flex flex-wrap gap-1">
                    {vehicles.map((v) => (
                      <span key={v.id} className="text-xs bg-dark-700 px-2 py-1 rounded text-dark-300">
                        {v.plate_number}: {v.capacity} kg
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Kapasite kullanım çubuğu */}
              <div className="pt-2">
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isLimitedDisabled 
                        ? 'bg-gradient-to-r from-yellow-500 to-red-500' 
                        : 'bg-gradient-to-r from-accent-500 to-primary-500'
                    }`}
                    style={{ width: `${totalVehicleCapacity > 0 ? Math.min(100, (totalWeight / totalVehicleCapacity) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-dark-500 text-xs mt-1 text-right">
                  %{totalVehicleCapacity > 0 ? ((totalWeight / totalVehicleCapacity) * 100).toFixed(0) : 0} kullanım
                </p>
              </div>
            </div>

            {/* Kapasite yetersizse uyarı */}
            {problemType === 'limited' && isLimitedDisabled && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Mevcut araç kapasitesi yetersiz! Kargo miktarını azaltın veya "Sınırsız Araç" seçeneğini kullanın.
                </p>
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={calculating || totalCargo === 0 || (problemType === 'limited' && isLimitedDisabled)}
              className={`w-full mt-6 btn-primary flex items-center justify-center gap-2 ${
                (problemType === 'limited' && isLimitedDisabled) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {calculating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Hesapla
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Station Inputs & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Inputs */}
          <div className="card">
            <h3 className="font-display text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-400" />
              İstasyon Kargo Bilgileri
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
              {stations.map((station) => (
                <div key={station.id} className="p-4 bg-dark-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <span className="text-dark-100 font-medium">{station.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-dark-400 text-xs">Kargo Sayısı</label>
                      <input
                        type="number"
                        min="0"
                        value={stationInputs[station.id]?.cargo_count || 0}
                        onChange={(e) =>
                          setStationInputs({
                            ...stationInputs,
                            [station.id]: {
                              ...stationInputs[station.id],
                              cargo_count: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="input py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-dark-400 text-xs">Ağırlık (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={stationInputs[station.id]?.total_weight || 0}
                        onChange={(e) =>
                          setStationInputs({
                            ...stationInputs,
                            [station.id]: {
                              ...stationInputs[station.id],
                              total_weight: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="input py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="card animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-semibold text-dark-100 flex items-center gap-2">
                  <Route className="w-5 h-5 text-accent-400" />
                  Optimizasyon Sonucu
                </h3>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="btn-primary flex items-center gap-2"
                >
                  {applying ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Uygula
                    </>
                  )}
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-dark-800 rounded-lg p-4 text-center">
                  <p className="text-dark-400 text-sm">Toplam Maliyet</p>
                  <p className="font-display text-2xl font-bold text-primary-400">
                    {result.total_cost.toFixed(0)} ₺
                  </p>
                </div>
                <div className="bg-dark-800 rounded-lg p-4 text-center">
                  <p className="text-dark-400 text-sm">Toplam Mesafe</p>
                  <p className="font-display text-2xl font-bold text-blue-400">
                    {result.total_distance.toFixed(1)} km
                  </p>
                </div>
                <div className="bg-dark-800 rounded-lg p-4 text-center">
                  <p className="text-dark-400 text-sm">Kullanılan Araç</p>
                  <p className="font-display text-2xl font-bold text-accent-400">
                    {result.vehicles_used}
                  </p>
                </div>
                <div className="bg-dark-800 rounded-lg p-4 text-center">
                  <p className="text-dark-400 text-sm">Kiralık Araç</p>
                  <p className="font-display text-2xl font-bold text-yellow-400">
                    {result.rented_vehicles}
                  </p>
                </div>
              </div>

              {/* Vehicle Routes */}
              <div className="space-y-4">
                {result.vehicle_routes.map((vr, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      vr.is_rented
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : 'bg-dark-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Truck className={`w-5 h-5 ${vr.is_rented ? 'text-yellow-400' : 'text-accent-400'}`} />
                        <span className="font-mono text-dark-100">{vr.plate_number}</span>
                        {vr.is_rented && (
                          <span className="badge badge-warning">Kiralık</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-dark-400">
                          {vr.total_distance.toFixed(1)} km
                        </span>
                        <span className="text-dark-400">
                          {vr.total_weight.toFixed(1)} kg
                        </span>
                        <span className="text-primary-400 font-semibold">
                          <span className="text-sm font-semibold">₺</span>
                          {vr.route_cost.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-dark-500 text-sm">Merkez</span>
                      {vr.route.map((station, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-dark-600" />
                          <span className="px-2 py-1 bg-dark-700 rounded text-dark-200 text-sm">
                            {station.name}
                          </span>
                        </div>
                      ))}
                      <ArrowRight className="w-4 h-4 text-dark-600" />
                      <span className="text-dark-500 text-sm">Merkez</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rejected Cargos */}
              {result.rejected_cargos.length > 0 && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h4 className="text-red-400 font-medium mb-2">
                    Reddedilen Kargolar ({result.rejected_cargos.length})
                  </h4>
                  <p className="text-dark-400 text-sm">
                    Kapasite yetersizliği nedeniyle bazı kargolar taşınamadı.
                  </p>
                </div>
              )}

              {/* Map Preview */}
              <div className="mt-6">
                <h4 className="font-medium text-dark-100 mb-3">Rota Haritası</h4>
                <div className="h-[300px] rounded-xl overflow-hidden">
                  <MapComponent
                    stations={allStations}
                    routes={result.vehicle_routes.map((vr, i) => ({
                      id: i,
                      vehicle_id: vr.vehicle_id,
                      total_distance: vr.total_distance,
                      total_cost: vr.route_cost,
                      total_weight: vr.total_weight,
                      cargo_count: vr.cargo_count,
                      status: 'planned',
                      created_at: new Date().toISOString(),
                      planned_date: null,
                      route_geometry: vr.route_geometry,
                      stops: vr.route.map((s, j) => ({
                        id: j,
                        station_id: s.id,
                        order: j + 1,
                        arrival_distance: 0,
                        cargo_weight: 0,
                        cargo_count: 0,
                        station: s,
                      })),
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

