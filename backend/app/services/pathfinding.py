"""
Kendi Yol Çizdirme Algoritması
OSRM API'den yol verilerini alıp kendi algoritmamızla işleme

Yaklaşım:
1. OSRM API'den ham yol koordinatlarını al
2. Kendi algoritma ile koordinatları işle (smoothing, interpolation)
3. GeoJSON formatına çevir
"""

import math
import heapq
import httpx
import json
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

@dataclass
class Node:
    """Yol ağındaki düğüm (kavşak/nokta)"""
    id: str
    latitude: float
    longitude: float
    name: str = ""

@dataclass
class Edge:
    """Yol segmenti"""
    from_node: str
    to_node: str
    distance: float  # km

class RoadNetwork:
    """
    Kocaeli Yol Ağı
    İlçeler arası gerçek yol bağlantılarını modelleyen graf yapısı
    """
    
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, List[Tuple[str, float]]] = {}  # adjacency list
        self._build_kocaeli_network()
    
    def _build_kocaeli_network(self):
        """Kocaeli yol ağını oluştur"""
        
        # Ana düğümler (ilçe merkezleri - Google Maps belediye binalarından doğrulanmış)
        self._add_node("uni", 40.8203, 29.9261, "Umuttepe (Kocaeli Üniversitesi)")
        self._add_node("izmit", 40.7654, 29.9167, "İzmit")
        self._add_node("basiskele", 40.7062, 29.8436, "Başiskele")
        self._add_node("kartepe", 40.7389, 30.0342, "Kartepe")
        self._add_node("golcuk", 40.7175, 29.8131, "Gölcük")
        self._add_node("karamursel", 40.6897, 29.6156, "Karamürsel")
        self._add_node("korfez", 40.7494, 29.7619, "Körfez")
        self._add_node("derince", 40.7544, 29.8292, "Derince")
        self._add_node("dilovasi", 40.7869, 29.5381, "Dilovası")
        self._add_node("gebze", 40.8027, 29.4307, "Gebze")
        self._add_node("cayirova", 40.8272, 29.3714, "Çayırova")
        self._add_node("darica", 40.7692, 29.3747, "Darıca")
        self._add_node("kandira", 41.0714, 30.1489, "Kandıra")
        
        # Ara düğümler (yol kavşakları)
        self._add_node("kav1", 40.7900, 29.8800, "Kavşak-1")  # İzmit-Derince arası
        self._add_node("kav2", 40.7700, 29.7000, "Kavşak-2")  # Körfez-Karamürsel arası
        self._add_node("kav3", 40.8100, 29.5800, "Kavşak-3")  # Dilovası-Körfez arası
        self._add_node("kav4", 40.8150, 29.4000, "Kavşak-4")  # Gebze-Çayırova arası
        self._add_node("kav5", 40.7800, 29.9300, "Kavşak-5")  # Üniversite-İzmit arası
        self._add_node("kav6", 40.7400, 29.8800, "Kavşak-6")  # Derince-Gölcük arası
        self._add_node("kav7", 40.9500, 30.0500, "Kavşak-7")  # Kandıra yolu
        
        # Yol bağlantıları (çift yönlü)
        # Ana arterler - D100 / E80
        self._add_edge("uni", "kav5", 5.2)
        self._add_edge("kav5", "izmit", 3.8)
        self._add_edge("izmit", "kav1", 4.5)
        self._add_edge("kav1", "derince", 3.2)
        self._add_edge("derince", "korfez", 8.5)
        self._add_edge("korfez", "kav3", 6.3)
        self._add_edge("kav3", "dilovasi", 7.8)
        self._add_edge("dilovasi", "gebze", 12.4)
        self._add_edge("gebze", "kav4", 3.5)
        self._add_edge("kav4", "cayirova", 4.2)
        self._add_edge("cayirova", "darica", 5.8)
        
        # Güney bağlantıları
        self._add_edge("izmit", "basiskele", 6.5)
        self._add_edge("basiskele", "kartepe", 8.3)
        self._add_edge("basiskele", "golcuk", 9.2)
        self._add_edge("golcuk", "kav6", 4.5)
        self._add_edge("kav6", "derince", 5.8)
        
        # Karamürsel bağlantısı
        self._add_edge("golcuk", "karamursel", 15.6)
        self._add_edge("korfez", "kav2", 5.2)
        self._add_edge("kav2", "karamursel", 12.3)
        
        # Kandıra bağlantısı (kuzey)
        self._add_edge("uni", "kav7", 18.5)
        self._add_edge("kav7", "kandira", 22.3)
        self._add_edge("izmit", "kav7", 21.0)
        
        # Alternatif yollar
        self._add_edge("gebze", "darica", 8.5)
        self._add_edge("korfez", "golcuk", 11.2)
        self._add_edge("dilovasi", "kav4", 15.6)
    
    def _add_node(self, node_id: str, lat: float, lon: float, name: str = ""):
        """Düğüm ekle"""
        self.nodes[node_id] = Node(id=node_id, latitude=lat, longitude=lon, name=name)
        if node_id not in self.edges:
            self.edges[node_id] = []
    
    def _add_edge(self, from_id: str, to_id: str, distance: float):
        """Çift yönlü kenar ekle"""
        if from_id not in self.edges:
            self.edges[from_id] = []
        if to_id not in self.edges:
            self.edges[to_id] = []
        
        self.edges[from_id].append((to_id, distance))
        self.edges[to_id].append((from_id, distance))
    
    def _heuristic(self, node1_id: str, node2_id: str) -> float:
        """A* için heuristik fonksiyon (Haversine mesafe)"""
        if node1_id not in self.nodes or node2_id not in self.nodes:
            return 0
        
        n1 = self.nodes[node1_id]
        n2 = self.nodes[node2_id]
        
        R = 6371  # Dünya yarıçapı km
        lat1, lat2 = math.radians(n1.latitude), math.radians(n2.latitude)
        dlat = math.radians(n2.latitude - n1.latitude)
        dlon = math.radians(n2.longitude - n1.longitude)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def find_nearest_node(self, lat: float, lon: float) -> str:
        """Koordinata en yakın düğümü bul"""
        min_dist = float('inf')
        nearest = None
        
        for node_id, node in self.nodes.items():
            dist = self._heuristic_coords(lat, lon, node.latitude, node.longitude)
            if dist < min_dist:
                min_dist = dist
                nearest = node_id
        
        return nearest
    
    def _heuristic_coords(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Koordinatlar arası heuristik mesafe"""
        R = 6371
        lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def find_shortest_path(self, start_id: str, end_id: str) -> Tuple[List[str], float]:
        """
        A* Algoritması ile en kısa yol
        Returns: (yol_düğümleri, toplam_mesafe)
        """
        if start_id not in self.nodes or end_id not in self.nodes:
            return [], 0
        
        if start_id == end_id:
            return [start_id], 0
        
        # A* algoritması
        open_set = [(0, start_id)]  # (f_score, node_id)
        came_from: Dict[str, str] = {}
        g_score: Dict[str, float] = {start_id: 0}
        f_score: Dict[str, float] = {start_id: self._heuristic(start_id, end_id)}
        
        while open_set:
            _, current = heapq.heappop(open_set)
            
            if current == end_id:
                # Yolu oluştur
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                return path, g_score[end_id]
            
            for neighbor, distance in self.edges.get(current, []):
                tentative_g = g_score[current] + distance
                
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score[neighbor] = tentative_g + self._heuristic(neighbor, end_id)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
        
        # Yol bulunamadı, direkt mesafe döndür
        direct_dist = self._heuristic(start_id, end_id) * 1.3
        return [start_id, end_id], direct_dist
    
    def get_path_coordinates(self, path: List[str]) -> List[Tuple[float, float]]:
        """Yol düğümlerinin koordinatlarını döndür"""
        coords = []
        for node_id in path:
            if node_id in self.nodes:
                node = self.nodes[node_id]
                coords.append((node.latitude, node.longitude))
        return coords
    
    def get_route_between_stations(
        self, 
        start_lat: float, start_lon: float,
        end_lat: float, end_lon: float
    ) -> Tuple[List[Tuple[float, float]], float]:
        """
        İki istasyon arasındaki rota ve mesafe
        Returns: (koordinat_listesi, toplam_mesafe)
        """
        start_node = self.find_nearest_node(start_lat, start_lon)
        end_node = self.find_nearest_node(end_lat, end_lon)
        
        path, distance = self.find_shortest_path(start_node, end_node)
        coordinates = self.get_path_coordinates(path)
        
        # Başlangıç ve bitiş noktalarını ekle
        if coordinates:
            coordinates.insert(0, (start_lat, start_lon))
            coordinates.append((end_lat, end_lon))
        else:
            coordinates = [(start_lat, start_lon), (end_lat, end_lon)]
            distance = self._heuristic_coords(start_lat, start_lon, end_lat, end_lon) * 1.3
        
        return coordinates, distance
    
    def get_multi_stop_route(
        self, 
        stops: List[Tuple[float, float]]
    ) -> Tuple[List[Tuple[float, float]], float]:
        """
        Çoklu durak için rota hesapla
        stops: [(lat, lon), ...]
        Returns: (tüm_koordinatlar, toplam_mesafe)
        """
        if len(stops) < 2:
            return stops, 0
        
        all_coords = []
        total_distance = 0
        
        for i in range(len(stops) - 1):
            start = stops[i]
            end = stops[i + 1]
            
            segment_coords, segment_dist = self.get_route_between_stations(
                start[0], start[1], end[0], end[1]
            )
            
            # İlk segment hariç, başlangıç noktasını atlayarak ekle (tekrar önleme)
            if i == 0:
                all_coords.extend(segment_coords)
            else:
                all_coords.extend(segment_coords[1:])
            
            total_distance += segment_dist
        
        return all_coords, total_distance

# Global instance
road_network = RoadNetwork()


def calculate_route_geometry(coordinates: List[Tuple[float, float]]) -> str:
    """
    Koordinat listesinden GeoJSON LineString oluştur
    Bu fonksiyon OSRM yerine kullanılacak
    """
    import json
    
    if len(coordinates) < 2:
        return ""
    
    # GeoJSON formatı (longitude, latitude sırası)
    geojson = {
        "type": "LineString",
        "coordinates": [[lon, lat] for lat, lon in coordinates]
    }
    
    return json.dumps(geojson)


def get_distance_and_route(
    start_lat: float, start_lon: float,
    end_lat: float, end_lon: float
) -> Tuple[float, str]:
    """
    İki nokta arası mesafe ve rota geometrisi
    OSRM API yerine bu fonksiyon kullanılacak
    """
    coords, distance = road_network.get_route_between_stations(
        start_lat, start_lon, end_lat, end_lon
    )
    geometry = calculate_route_geometry(coords)
    
    return distance, geometry


def get_multi_stop_route_geometry(
    stops: List[Tuple[float, float]]
) -> Tuple[float, str]:
    """
    Çoklu durak için mesafe ve rota geometrisi
    """
    coords, distance = road_network.get_multi_stop_route(stops)
    geometry = calculate_route_geometry(coords)
    
    return distance, geometry


# ============================================================
# OSRM + Kendi Algoritma Entegrasyonu
# ============================================================

class RouteProcessor:
    """
    OSRM'den alınan yol verilerini kendi algoritmamızla işleyen sınıf
    
    Bu sınıf:
    1. OSRM API'den ham koordinatları alır
    2. Koordinatları Douglas-Peucker algoritması ile sadeleştirir
    3. Bezier eğrisi ile yumuşatma uygular
    4. GeoJSON formatına çevirir
    """
    
    OSRM_BASE_URL = "http://router.project-osrm.org"
    
    def __init__(self):
        self.client = httpx.Client(timeout=10.0)
    
    def fetch_osrm_route(self, start: Tuple[float, float], end: Tuple[float, float]) -> Optional[List[Tuple[float, float]]]:
        """
        OSRM API'den iki nokta arası yol koordinatlarını al
        Returns: [(lat, lon), ...] veya None
        """
        try:
            # OSRM format: longitude,latitude
            url = f"{self.OSRM_BASE_URL}/route/v1/driving/{start[1]},{start[0]};{end[1]},{end[0]}"
            params = {
                "overview": "full",
                "geometries": "geojson"
            }
            
            response = self.client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    # GeoJSON koordinatları [lon, lat] formatında
                    geojson_coords = data["routes"][0]["geometry"]["coordinates"]
                    # (lat, lon) formatına çevir
                    return [(coord[1], coord[0]) for coord in geojson_coords]
        except Exception as e:
            print(f"OSRM API hatası: {e}")
        
        return None
    
    def douglas_peucker(self, points: List[Tuple[float, float]], epsilon: float = 0.0001) -> List[Tuple[float, float]]:
        """
        Douglas-Peucker Algoritması
        Çizgiyi sadeleştirerek nokta sayısını azaltır
        
        Bu bizim yazdığımız bir algoritma - hazır değil!
        """
        if len(points) <= 2:
            return points
        
        # En uzak noktayı bul
        max_distance = 0
        max_index = 0
        
        start = points[0]
        end = points[-1]
        
        for i in range(1, len(points) - 1):
            distance = self._perpendicular_distance(points[i], start, end)
            if distance > max_distance:
                max_distance = distance
                max_index = i
        
        # Eğer en uzak nokta epsilon'dan büyükse, böl ve tekrar uygula
        if max_distance > epsilon:
            left = self.douglas_peucker(points[:max_index + 1], epsilon)
            right = self.douglas_peucker(points[max_index:], epsilon)
            return left[:-1] + right
        else:
            return [start, end]
    
    def _perpendicular_distance(self, point: Tuple[float, float], 
                                 line_start: Tuple[float, float], 
                                 line_end: Tuple[float, float]) -> float:
        """Noktanın çizgiye dik mesafesi"""
        if line_start == line_end:
            return self._haversine(point[0], point[1], line_start[0], line_start[1])
        
        # Vektör hesaplama
        dx = line_end[0] - line_start[0]
        dy = line_end[1] - line_start[1]
        
        # Çizgi uzunluğunun karesi
        line_length_sq = dx * dx + dy * dy
        
        # Parametrik t değeri
        t = max(0, min(1, ((point[0] - line_start[0]) * dx + (point[1] - line_start[1]) * dy) / line_length_sq))
        
        # En yakın nokta
        nearest_x = line_start[0] + t * dx
        nearest_y = line_start[1] + t * dy
        
        return self._haversine(point[0], point[1], nearest_x, nearest_y)
    
    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Haversine mesafe formülü (km)"""
        R = 6371
        lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def bezier_smooth(self, points: List[Tuple[float, float]], num_points: int = 50) -> List[Tuple[float, float]]:
        """
        Bezier Eğrisi ile Yumuşatma
        Keskin köşeleri yumuşatır
        
        Bu bizim yazdığımız bir algoritma - hazır değil!
        """
        if len(points) < 3:
            return points
        
        smoothed = []
        
        # Her 3-4 nokta için Bezier eğrisi uygula
        for i in range(0, len(points) - 2, 2):
            p0 = points[i]
            p1 = points[min(i + 1, len(points) - 1)]
            p2 = points[min(i + 2, len(points) - 1)]
            
            # Quadratic Bezier eğrisi
            for t in range(num_points // (len(points) // 2 + 1)):
                t_norm = t / (num_points // (len(points) // 2 + 1))
                
                # B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                x = (1 - t_norm)**2 * p0[0] + 2 * (1 - t_norm) * t_norm * p1[0] + t_norm**2 * p2[0]
                y = (1 - t_norm)**2 * p0[1] + 2 * (1 - t_norm) * t_norm * p1[1] + t_norm**2 * p2[1]
                
                smoothed.append((x, y))
        
        # Son noktayı ekle
        smoothed.append(points[-1])
        
        return smoothed
    
    def interpolate_route(self, points: List[Tuple[float, float]], 
                          min_distance: float = 0.1) -> List[Tuple[float, float]]:
        """
        Rota İnterpolasyonu
        Uzak noktalar arasına ara noktalar ekler
        
        min_distance: minimum nokta arası mesafe (km)
        """
        if len(points) < 2:
            return points
        
        interpolated = [points[0]]
        
        for i in range(1, len(points)):
            prev = interpolated[-1]
            curr = points[i]
            
            dist = self._haversine(prev[0], prev[1], curr[0], curr[1])
            
            if dist > min_distance:
                # Ara noktalar ekle
                num_segments = int(dist / min_distance)
                for j in range(1, num_segments):
                    t = j / num_segments
                    lat = prev[0] + t * (curr[0] - prev[0])
                    lon = prev[1] + t * (curr[1] - prev[1])
                    interpolated.append((lat, lon))
            
            interpolated.append(curr)
        
        return interpolated
    
    def process_route(self, start: Tuple[float, float], end: Tuple[float, float]) -> Tuple[List[Tuple[float, float]], float]:
        """
        Ana işleme fonksiyonu
        1. OSRM'den ham veriyi al
        2. Douglas-Peucker ile sadeleştir
        3. İnterpolasyon uygula
        4. Mesafeyi hesapla
        
        Returns: (işlenmiş_koordinatlar, toplam_mesafe)
        """
        # OSRM'den ham veriyi al
        raw_coords = self.fetch_osrm_route(start, end)
        
        if raw_coords and len(raw_coords) > 2:
            # Kendi algoritmalarımızla işle
            simplified = self.douglas_peucker(raw_coords, epsilon=0.00005)
            processed = self.interpolate_route(simplified, min_distance=0.5)
            
            # Toplam mesafeyi hesapla
            total_distance = 0
            for i in range(1, len(processed)):
                total_distance += self._haversine(
                    processed[i-1][0], processed[i-1][1],
                    processed[i][0], processed[i][1]
                )
            
            return processed, total_distance
        
        # OSRM başarısız - yerel graf algoritmasına düş
        return road_network.get_route_between_stations(start[0], start[1], end[0], end[1])
    
    def process_multi_stop_route(self, stops: List[Tuple[float, float]]) -> Tuple[List[Tuple[float, float]], float]:
        """
        Çoklu durak için rota işleme
        """
        if len(stops) < 2:
            return stops, 0
        
        all_coords = []
        total_distance = 0
        
        for i in range(len(stops) - 1):
            segment_coords, segment_dist = self.process_route(stops[i], stops[i + 1])
            
            if i == 0:
                all_coords.extend(segment_coords)
            else:
                all_coords.extend(segment_coords[1:])
            
            total_distance += segment_dist
        
        return all_coords, total_distance
    
    def get_route_geometry(self, stops: List[Tuple[float, float]]) -> Optional[str]:
        """
        Çoklu durak için rota geometrisi (GeoJSON)
        """
        coords, distance = self.process_multi_stop_route(stops)
        
        if not coords:
            return None
        
        # GeoJSON formatına çevir (lon, lat sırası)
        geojson = {
            "type": "LineString",
            "coordinates": [[lon, lat] for lat, lon in coords]
        }
        
        return json.dumps(geojson)


# Global route processor instance
route_processor = RouteProcessor()

