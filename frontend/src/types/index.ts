export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  is_headquarters: boolean;
  is_active: boolean;
  cargo_count?: number;
  total_weight?: number;
}

export interface Cargo {
  id: number;
  tracking_code: string;
  sender_name: string;
  sender_phone: string;
  weight: number;
  station_id: number;
  status: CargoStatus;
  created_at: string;
  delivery_date: string | null;
  assigned_vehicle_id: number | null;
  assigned_route_id: number | null;
  station?: Station;
}

export type CargoStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

export interface Vehicle {
  id: number;
  plate_number: string;
  capacity: number;
  fuel_consumption: number;
  is_rented: boolean;
  rental_cost: number;
  is_available: boolean;
}

export interface RouteStop {
  id: number;
  station_id: number;
  order: number;
  arrival_distance: number;
  cargo_weight: number;
  cargo_count: number;
  station: Station;
}

export interface Route {
  id: number;
  vehicle_id: number;
  total_distance: number;
  total_cost: number;
  total_weight: number;
  cargo_count: number;
  status: string;
  created_at: string;
  planned_date: string | null;
  route_geometry: string | null;
  vehicle?: Vehicle;
  stops?: RouteStop[];
}

export interface Trip {
  id: number;
  route_id: number;
  vehicle_id: number;
  start_time: string;
  end_time: string | null;
  status: string;
  total_distance: number;
  total_cost: number;
  cargo_count: number;
  total_weight: number;
}

export interface StationCargoInput {
  station_id: number;
  cargo_count: number;
  total_weight: number;
}

export interface VehicleRoute {
  vehicle_id: number;
  plate_number: string;
  capacity: number;
  is_rented: boolean;
  rental_cost: number;
  route: Station[];
  total_distance: number;
  total_weight: number;
  cargo_count: number;
  route_cost: number;
  route_geometry: string | null;
}

export interface OptimizationResult {
  total_cost: number;
  total_distance: number;
  total_cargo_count: number;
  total_weight: number;
  vehicles_used: number;
  rented_vehicles: number;
  vehicle_routes: VehicleRoute[];
  rejected_cargos: StationCargoInput[];
}

export interface DashboardStats {
  total_stations: number;
  total_cargos: number;
  pending_cargos: number;
  total_vehicles: number;
  available_vehicles: number;
  active_routes: number;
  total_trips: number;
  total_distance_today: number;
  total_cost_today: number;
}

export interface Scenario {
  name: string;
  description: string;
  stations: {
    station_name: string;
    cargo_count: number;
    total_weight: number;
  }[];
}

