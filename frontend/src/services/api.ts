import axios from 'axios';
import type { 
  User, Station, Cargo, Vehicle, Route, Trip, 
  OptimizationResult, DashboardStats, Scenario, StationCargoInput 
} from '../types';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      { username, password }
    );
    return response.data;
  },

  register: async (data: { username: string; email: string; password: string; full_name?: string }) => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Stations API
export const stationsAPI = {
  getAll: async () => {
    const response = await api.get<Station[]>('/stations/');
    return response.data;
  },

  getWithCargo: async () => {
    const response = await api.get<Station[]>('/stations/with-cargo');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Station>(`/stations/${id}`);
    return response.data;
  },

  create: async (data: Partial<Station>) => {
    const response = await api.post<Station>('/stations/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Station>) => {
    const response = await api.put<Station>(`/stations/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/stations/${id}`);
    return response.data;
  },
};

// Cargos API
export const cargosAPI = {
  getAll: async (status?: string, stationId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (stationId) params.append('station_id', stationId.toString());
    const response = await api.get<Cargo[]>(`/cargos/?${params}`);
    return response.data;
  },

  getPending: async () => {
    const response = await api.get<Cargo[]>('/cargos/pending');
    return response.data;
  },

  track: async (trackingCode: string) => {
    const response = await api.get<Cargo>(`/cargos/tracking/${trackingCode}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Cargo>(`/cargos/${id}`);
    return response.data;
  },

  create: async (data: { 
    sender_name: string; 
    sender_phone: string; 
    weight: number; 
    station_id: number;
    delivery_date?: string;
  }) => {
    const response = await api.post<Cargo>('/cargos/', data);
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.put(`/cargos/${id}/status?status=${status}`);
    return response.data;
  },

  cancel: async (id: number) => {
    const response = await api.delete(`/cargos/${id}`);
    return response.data;
  },
};

// Vehicles API
export const vehiclesAPI = {
  getAll: async () => {
    const response = await api.get<Vehicle[]>('/vehicles/');
    return response.data;
  },

  getAvailable: async () => {
    const response = await api.get<Vehicle[]>('/vehicles/available');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Vehicle>(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: Partial<Vehicle>) => {
    const response = await api.post<Vehicle>('/vehicles/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Vehicle>) => {
    const response = await api.put<Vehicle>(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },
};

// Routes API
export const routesAPI = {
  getAll: async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<Route[]>(`/routes/${params}`);
    return response.data;
  },

  getActive: async () => {
    const response = await api.get<Route[]>('/routes/active');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Route>(`/routes/${id}`);
    return response.data;
  },

  getByCargoTracking: async (trackingCode: string) => {
    const response = await api.get<Route>(`/routes/my-route/${trackingCode}`);
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.put(`/routes/${id}/status?status=${status}`);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/routes/${id}`);
    return response.data;
  },
};

// Optimization API
export const optimizationAPI = {
  calculate: async (
    stations: StationCargoInput[],
    problemType: 'unlimited' | 'limited' = 'unlimited',
    maxVehicles?: number
  ) => {
    const response = await api.post<OptimizationResult>('/optimization/calculate', {
      stations,
      problem_type: problemType,
      max_vehicles: maxVehicles,
    });
    return response.data;
  },

  apply: async (
    stations: StationCargoInput[],
    problemType: 'unlimited' | 'limited' = 'unlimited',
    maxVehicles?: number
  ) => {
    const response = await api.post('/optimization/apply', {
      stations,
      problem_type: problemType,
      max_vehicles: maxVehicles,
    });
    return response.data;
  },

  getScenarios: async () => {
    const response = await api.get<Scenario[]>('/optimization/scenarios');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await api.get<User[]>('/users/');
    return response.data;
  },

  toggleAdmin: async (userId: number) => {
    const response = await api.put(`/users/${userId}/toggle-admin`);
    return response.data;
  },

  toggleActive: async (userId: number) => {
    const response = await api.put(`/users/${userId}/toggle-active`);
    return response.data;
  },

  delete: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  getTrips: async () => {
    const response = await api.get<Trip[]>('/dashboard/trips');
    return response.data;
  },

  getTodayTrips: async () => {
    const response = await api.get<Trip[]>('/dashboard/trips/today');
    return response.data;
  },

  getSummary: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await api.get(`/dashboard/summary?${params}`);
    return response.data;
  },
};

export default api;

