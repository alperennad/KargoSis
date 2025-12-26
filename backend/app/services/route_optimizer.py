"""
Clarke-Wright Savings Algoritması ile Rota Optimizasyonu
Vehicle Routing Problem (VRP) çözümü
Brute-force yerine sezgisel yaklaşım kullanılır
"""

from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from .distance_service import DistanceService
import heapq

@dataclass
class Station:
    id: int
    name: str
    latitude: float
    longitude: float
    cargo_count: int
    total_weight: float

@dataclass
class Vehicle:
    id: int
    plate_number: str
    capacity: float
    is_rented: bool
    rental_cost: float

@dataclass
class RouteInfo:
    vehicle: Vehicle
    stations: List[Station]
    total_distance: float
    total_weight: float
    cargo_count: int
    route_cost: float
    route_geometry: Optional[str] = None

class RouteOptimizer:
    """
    Clarke-Wright Savings Algoritması kullanarak VRP çözümü
    Sezgisel yaklaşım - O(n²) karmaşıklık
    """
    
    COST_PER_KM = 1.0  # km başına maliyet
    RENTAL_COST = 200.0  # Araç kiralama maliyeti
    RENTAL_CAPACITY = 500.0  # Kiralık araç kapasitesi
    
    def __init__(self):
        self.distance_service = DistanceService()
    
    def calculate_savings(self, depot: Station, stations: List[Station], 
                          distance_matrix: List[List[float]]) -> List[Tuple[float, int, int]]:
        """
        Clarke-Wright Savings hesaplama
        savings(i,j) = d(depot,i) + d(depot,j) - d(i,j)
        """
        n = len(stations)
        depot_idx = 0  # Depot/merkez index
        
        savings = []
        for i in range(1, n):
            for j in range(i + 1, n):
                # Savings = depot->i + depot->j - i->j
                saving = (distance_matrix[depot_idx][i] + 
                         distance_matrix[depot_idx][j] - 
                         distance_matrix[i][j])
                if saving > 0:
                    heapq.heappush(savings, (-saving, i, j))  # Max heap (negatif)
        
        return savings
    
    def optimize_unlimited_vehicles(self, depot: Station, stations: List[Station], 
                                     vehicles: List[Vehicle]) -> List[RouteInfo]:
        """
        Sınırsız araç problemi çözümü
        Mevcut araçlar yetmezse kiralık araç ekler
        """
        if not stations:
            return []
        
        # Mesafe matrisi oluştur (depot dahil)
        all_stations = [depot] + stations
        distance_matrix = self._build_distance_matrix(all_stations)
        
        # Savings hesapla
        savings = self.calculate_savings(depot, all_stations, distance_matrix)
        
        # Her istasyon için ayrı rota ile başla
        routes: Dict[int, List[int]] = {i: [i] for i in range(1, len(all_stations))}
        route_loads: Dict[int, float] = {i: all_stations[i].total_weight for i in range(1, len(all_stations))}
        station_route: Dict[int, int] = {i: i for i in range(1, len(all_stations))}
        
        # Araçları kapasiteye göre sırala (büyükten küçüğe)
        available_vehicles = sorted(vehicles, key=lambda v: v.capacity, reverse=True)
        
        # Toplam kapasite
        total_capacity = sum(v.capacity for v in available_vehicles)
        total_demand = sum(s.total_weight for s in stations)
        
        # Gerekli kiralık araç sayısı
        extra_capacity_needed = max(0, total_demand - total_capacity)
        num_rentals = int(extra_capacity_needed / self.RENTAL_CAPACITY) + (1 if extra_capacity_needed % self.RENTAL_CAPACITY > 0 else 0)
        
        # Kiralık araçları ekle
        for i in range(num_rentals):
            rental_vehicle = Vehicle(
                id=-i-1,
                plate_number=f"KİRALIK-{i+1}",
                capacity=self.RENTAL_CAPACITY,
                is_rented=True,
                rental_cost=self.RENTAL_COST
            )
            available_vehicles.append(rental_vehicle)
        
        # Maksimum araç kapasitesi (şimdilik en büyük araç)
        max_capacity = max(v.capacity for v in available_vehicles)
        
        # Savings algoritması ile rotaları birleştir
        while savings:
            neg_saving, i, j = heapq.heappop(savings)
            
            route_i = station_route.get(i)
            route_j = station_route.get(j)
            
            if route_i is None or route_j is None or route_i == route_j:
                continue
            
            # Birleştirme mümkün mü kontrol et
            combined_load = route_loads[route_i] + route_loads[route_j]
            
            # En uygun araç kapasitesi kontrolü
            suitable_vehicle = next((v for v in available_vehicles if v.capacity >= combined_load), None)
            
            if suitable_vehicle is None:
                continue
            
            # Rotaları birleştir
            # i rotanın sonunda ve j rotanın başında olmalı
            route_i_list = routes[route_i]
            route_j_list = routes[route_j]
            
            if route_i_list[-1] == i and route_j_list[0] == j:
                # i sonunda, j başında - doğrudan birleştir
                new_route = route_i_list + route_j_list
            elif route_i_list[0] == i and route_j_list[-1] == j:
                # i başında, j sonunda - ters birleştir
                new_route = route_j_list + route_i_list
            elif route_i_list[0] == i and route_j_list[0] == j:
                # Her ikisi de başında
                new_route = list(reversed(route_i_list)) + route_j_list
            elif route_i_list[-1] == i and route_j_list[-1] == j:
                # Her ikisi de sonunda
                new_route = route_i_list + list(reversed(route_j_list))
            else:
                continue
            
            # Eski rotaları sil, yeni rotayı ekle
            del routes[route_i]
            del routes[route_j]
            del route_loads[route_i]
            del route_loads[route_j]
            
            new_route_id = min(route_i, route_j)
            routes[new_route_id] = new_route
            route_loads[new_route_id] = combined_load
            
            for station_idx in new_route:
                station_route[station_idx] = new_route_id
        
        # Rotaları araçlara ata - kapasite kontrolü ile
        result = []
        sorted_routes = sorted(routes.items(), key=lambda x: route_loads[x[0]], reverse=True)
        used_vehicles = set()
        
        for route_id, station_indices in sorted_routes:
            route_load = route_loads[route_id]
            route_stations = [all_stations[idx] for idx in station_indices]
            
            # Bu yük için uygun kapasiteli araç bul
            assigned_vehicle = None
            for vehicle in available_vehicles:
                if vehicle.id not in used_vehicles and vehicle.capacity >= route_load:
                    assigned_vehicle = vehicle
                    used_vehicles.add(vehicle.id)
                    break
            
            # Uygun araç yoksa rotayı böl veya kiralık araç ekle
            if assigned_vehicle is None:
                # Rotayı böl - her istasyonu ayrı değerlendir
                remaining_stations = route_stations.copy()
                max_iterations = len(remaining_stations) * 10  # Sonsuz döngü koruması
                iteration = 0
                
                while remaining_stations and iteration < max_iterations:
                    iteration += 1
                    
                    # En ağır istasyonun kapasitesini belirle
                    max_station_weight = max(s.total_weight for s in remaining_stations)
                    
                    # Yeni bir araç bul veya kirala
                    best_vehicle = None
                    for vehicle in available_vehicles:
                        if vehicle.id not in used_vehicles and vehicle.capacity >= max_station_weight:
                            best_vehicle = vehicle
                            used_vehicles.add(vehicle.id)
                            break
                    
                    if best_vehicle is None:
                        # Kiralık araç ekle - en ağır istasyona göre kapasite belirle
                        rental_id = -(len([v for v in available_vehicles if v.is_rented]) + 1)
                        # Kiralık araç kapasitesi en az en ağır istasyonu taşıyabilmeli
                        rental_capacity = max(self.RENTAL_CAPACITY, max_station_weight)
                        best_vehicle = Vehicle(
                            id=rental_id,
                            plate_number=f"KİRALIK-{abs(rental_id)}",
                            capacity=rental_capacity,
                            is_rented=True,
                            rental_cost=self.RENTAL_COST * (rental_capacity / self.RENTAL_CAPACITY)  # Kapasite oranına göre maliyet
                        )
                        available_vehicles.append(best_vehicle)
                        used_vehicles.add(best_vehicle.id)
                    
                    # Bu araca sığan istasyonları ekle
                    current_load = 0.0
                    current_stations = []
                    still_remaining = []
                    
                    for station in remaining_stations:
                        if current_load + station.total_weight <= best_vehicle.capacity:
                            current_stations.append(station)
                            current_load += station.total_weight
                        else:
                            still_remaining.append(station)
                    
                    remaining_stations = still_remaining
                    
                    if current_stations:
                        # Bu araç için rota oluştur
                        total_distance = self._calculate_route_distance_for_stations(depot, current_stations, distance_matrix, all_stations)
                        total_weight = sum(s.total_weight for s in current_stations)
                        cargo_count = sum(s.cargo_count for s in current_stations)
                        route_cost = total_distance * self.COST_PER_KM
                        if best_vehicle.is_rented:
                            route_cost += best_vehicle.rental_cost
                        
                        coordinates = [(depot.latitude, depot.longitude)]
                        coordinates.extend([(s.latitude, s.longitude) for s in current_stations])
                        coordinates.append((depot.latitude, depot.longitude))
                        route_geometry = self.distance_service.get_route_geometry(coordinates)
                        
                        result.append(RouteInfo(
                            vehicle=best_vehicle,
                            stations=current_stations,
                            total_distance=total_distance,
                            total_weight=total_weight,
                            cargo_count=cargo_count,
                            route_cost=route_cost,
                            route_geometry=route_geometry
                        ))
                
                continue  # Bu rota işlendi, sonrakine geç
            
            vehicle = assigned_vehicle
            
            # Rota mesafesini hesapla
            total_distance = self._calculate_route_distance(depot, route_stations, distance_matrix, 
                                                           [all_stations.index(s) for s in [depot] + route_stations])
            
            total_weight = sum(s.total_weight for s in route_stations)
            cargo_count = sum(s.cargo_count for s in route_stations)
            
            # Maliyet hesapla
            route_cost = total_distance * self.COST_PER_KM
            if vehicle.is_rented:
                route_cost += vehicle.rental_cost
            
            # Rota geometrisi al
            coordinates = [(depot.latitude, depot.longitude)]
            coordinates.extend([(s.latitude, s.longitude) for s in route_stations])
            coordinates.append((depot.latitude, depot.longitude))
            route_geometry = self.distance_service.get_route_geometry(coordinates)
            
            result.append(RouteInfo(
                vehicle=vehicle,
                stations=route_stations,
                total_distance=total_distance,
                total_weight=total_weight,
                cargo_count=cargo_count,
                route_cost=route_cost,
                route_geometry=route_geometry
            ))
        
        return result
    
    def optimize_limited_vehicles(self, depot: Station, stations: List[Station], 
                                   vehicles: List[Vehicle], 
                                   optimize_for: str = "weight") -> Tuple[List[RouteInfo], List[Station]]:
        """
        Belirli sayıda araç problemi çözümü
        optimize_for: "weight" (maksimum ağırlık) veya "count" (maksimum kargo sayısı)
        Returns: (rotalar, reddedilen istasyonlar)
        """
        if not stations or not vehicles:
            return [], stations
        
        # Mesafe matrisi oluştur
        all_stations = [depot] + stations
        distance_matrix = self._build_distance_matrix(all_stations)
        
        # Araçları kapasiteye göre sırala
        sorted_vehicles = sorted(vehicles, key=lambda v: v.capacity, reverse=True)
        total_capacity = sum(v.capacity for v in sorted_vehicles)
        
        # İstasyonları önceliğe göre sırala
        if optimize_for == "weight":
            # Ağırlık/mesafe oranına göre (daha verimli taşıma)
            sorted_stations = sorted(stations, 
                                    key=lambda s: s.total_weight / max(1, self._get_distance_to_depot(depot, s)), 
                                    reverse=True)
        else:
            # Kargo sayısı/mesafe oranına göre
            sorted_stations = sorted(stations, 
                                    key=lambda s: s.cargo_count / max(1, self._get_distance_to_depot(depot, s)), 
                                    reverse=True)
        
        # Greedy atama
        vehicle_routes: Dict[int, List[Station]] = {v.id: [] for v in sorted_vehicles}
        vehicle_loads: Dict[int, float] = {v.id: 0.0 for v in sorted_vehicles}
        assigned_stations = set()
        
        for station in sorted_stations:
            # En uygun aracı bul
            best_vehicle = None
            best_cost_increase = float('inf')
            
            for vehicle in sorted_vehicles:
                if vehicle_loads[vehicle.id] + station.total_weight <= vehicle.capacity:
                    # Bu araca eklenebilir
                    # Maliyet artışını hesapla (insertion cost)
                    current_route = vehicle_routes[vehicle.id]
                    cost_increase = self._calculate_insertion_cost(depot, current_route, station, distance_matrix, all_stations)
                    
                    if cost_increase < best_cost_increase:
                        best_cost_increase = cost_increase
                        best_vehicle = vehicle
            
            if best_vehicle:
                # En iyi pozisyona ekle
                best_position = self._find_best_insertion_position(depot, vehicle_routes[best_vehicle.id], 
                                                                   station, distance_matrix, all_stations)
                vehicle_routes[best_vehicle.id].insert(best_position, station)
                vehicle_loads[best_vehicle.id] += station.total_weight
                assigned_stations.add(station.id)
        
        # Sonuçları oluştur
        result = []
        for vehicle in sorted_vehicles:
            route_stations = vehicle_routes[vehicle.id]
            if not route_stations:
                continue
            
            # Rota mesafesini hesapla
            route_indices = [0] + [all_stations.index(s) for s in route_stations] + [0]
            total_distance = sum(distance_matrix[route_indices[i]][route_indices[i+1]] 
                                for i in range(len(route_indices)-1))
            
            total_weight = sum(s.total_weight for s in route_stations)
            cargo_count = sum(s.cargo_count for s in route_stations)
            route_cost = total_distance * self.COST_PER_KM
            
            # Rota geometrisi
            coordinates = [(depot.latitude, depot.longitude)]
            coordinates.extend([(s.latitude, s.longitude) for s in route_stations])
            coordinates.append((depot.latitude, depot.longitude))
            route_geometry = self.distance_service.get_route_geometry(coordinates)
            
            result.append(RouteInfo(
                vehicle=vehicle,
                stations=route_stations,
                total_distance=total_distance,
                total_weight=total_weight,
                cargo_count=cargo_count,
                route_cost=route_cost,
                route_geometry=route_geometry
            ))
        
        # Reddedilen istasyonlar
        rejected = [s for s in stations if s.id not in assigned_stations]
        
        return result, rejected
    
    def _build_distance_matrix(self, stations: List[Station]) -> List[List[float]]:
        """Mesafe matrisi oluştur"""
        n = len(stations)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(i + 1, n):
                dist = self.distance_service.haversine_distance(
                    stations[i].latitude, stations[i].longitude,
                    stations[j].latitude, stations[j].longitude
                ) * 1.3  # Yol düzeltme faktörü
                
                matrix[i][j] = dist
                matrix[j][i] = dist
        
        return matrix
    
    def _get_distance_to_depot(self, depot: Station, station: Station) -> float:
        """Depoya olan mesafe"""
        return self.distance_service.haversine_distance(
            depot.latitude, depot.longitude,
            station.latitude, station.longitude
        ) * 1.3
    
    def _calculate_route_distance(self, depot: Station, route: List[Station], 
                                  distance_matrix: List[List[float]], indices: List[int]) -> float:
        """Rota toplam mesafesi"""
        if not route:
            return 0
        
        # Depot -> ilk istasyon
        total = distance_matrix[0][indices[1]] if len(indices) > 1 else 0
        
        # İstasyonlar arası
        for i in range(1, len(indices) - 1):
            total += distance_matrix[indices[i]][indices[i + 1]]
        
        # Son istasyon -> depot
        if len(indices) > 1:
            total += distance_matrix[indices[-1]][0]
        
        return total
    
    def _calculate_route_distance_for_stations(self, depot: Station, stations: List[Station],
                                               distance_matrix: List[List[float]], 
                                               all_stations: List[Station]) -> float:
        """İstasyon listesi için rota mesafesi hesapla"""
        if not stations:
            return 0
        
        total = 0
        # Depot -> ilk istasyon
        first_idx = all_stations.index(stations[0])
        total += distance_matrix[0][first_idx]
        
        # İstasyonlar arası
        for i in range(len(stations) - 1):
            idx_current = all_stations.index(stations[i])
            idx_next = all_stations.index(stations[i + 1])
            total += distance_matrix[idx_current][idx_next]
        
        # Son istasyon -> depot
        last_idx = all_stations.index(stations[-1])
        total += distance_matrix[last_idx][0]
        
        return total
    
    def _calculate_insertion_cost(self, depot: Station, route: List[Station], 
                                  new_station: Station, distance_matrix: List[List[float]],
                                  all_stations: List[Station]) -> float:
        """Yeni istasyon ekleme maliyeti"""
        if not route:
            # Boş rotaya ekleme: depot -> station -> depot
            station_idx = all_stations.index(new_station)
            return 2 * distance_matrix[0][station_idx]
        
        # En iyi pozisyona ekleme maliyeti
        min_cost = float('inf')
        new_idx = all_stations.index(new_station)
        
        for pos in range(len(route) + 1):
            if pos == 0:
                # Başa ekleme
                first_idx = all_stations.index(route[0])
                cost = distance_matrix[0][new_idx] + distance_matrix[new_idx][first_idx] - distance_matrix[0][first_idx]
            elif pos == len(route):
                # Sona ekleme
                last_idx = all_stations.index(route[-1])
                cost = distance_matrix[last_idx][new_idx] + distance_matrix[new_idx][0] - distance_matrix[last_idx][0]
            else:
                # Ortaya ekleme
                prev_idx = all_stations.index(route[pos - 1])
                next_idx = all_stations.index(route[pos])
                cost = (distance_matrix[prev_idx][new_idx] + distance_matrix[new_idx][next_idx] 
                       - distance_matrix[prev_idx][next_idx])
            
            min_cost = min(min_cost, cost)
        
        return min_cost
    
    def _find_best_insertion_position(self, depot: Station, route: List[Station], 
                                      new_station: Station, distance_matrix: List[List[float]],
                                      all_stations: List[Station]) -> int:
        """En iyi ekleme pozisyonunu bul"""
        if not route:
            return 0
        
        min_cost = float('inf')
        best_pos = 0
        new_idx = all_stations.index(new_station)
        
        for pos in range(len(route) + 1):
            if pos == 0:
                first_idx = all_stations.index(route[0])
                cost = distance_matrix[0][new_idx] + distance_matrix[new_idx][first_idx] - distance_matrix[0][first_idx]
            elif pos == len(route):
                last_idx = all_stations.index(route[-1])
                cost = distance_matrix[last_idx][new_idx] + distance_matrix[new_idx][0] - distance_matrix[last_idx][0]
            else:
                prev_idx = all_stations.index(route[pos - 1])
                next_idx = all_stations.index(route[pos])
                cost = (distance_matrix[prev_idx][new_idx] + distance_matrix[new_idx][next_idx] 
                       - distance_matrix[prev_idx][next_idx])
            
            if cost < min_cost:
                min_cost = cost
                best_pos = pos
        
        return best_pos

# Global instance
route_optimizer = RouteOptimizer()

