"""
Mesafe Hesaplama Servisi

Yol Çizdirme Yaklaşımı:
1. OSRM API'den ham yol koordinatlarını al
2. Kendi algoritmalarımızla işle:
   - Douglas-Peucker sadeleştirme
   - Bezier yumuşatma
   - İnterpolasyon
3. GeoJSON formatına çevir

OSRM sadece veri kaynağı olarak kullanılıyor.
Tüm işleme algoritmaları bizim tarafımızdan yazılmış!
"""

import math
from typing import List, Tuple, Dict, Optional
import json

from app.services.pathfinding import road_network, calculate_route_geometry, route_processor

class DistanceService:
    """İstasyonlar arası mesafe hesaplama servisi"""
    
    # Kocaeli ilçe koordinatları (Google Maps belediye binalarından doğrulanmış)
    KOCAELI_DISTRICTS = {
        "Başiskele": (40.7062, 29.8436),
        "Çayırova": (40.8272, 29.3714),
        "Darıca": (40.7692, 29.3747),
        "Derince": (40.7544, 29.8292),
        "Dilovası": (40.7869, 29.5381),
        "Gebze": (40.8027, 29.4307),
        "Gölcük": (40.7175, 29.8131),
        "Kandıra": (41.0714, 30.1489),
        "Karamürsel": (40.6897, 29.6156),
        "Kartepe": (40.7389, 30.0342),
        "Körfez": (40.7494, 29.7619),
        "İzmit": (40.7654, 29.9167),
        "Umuttepe (Kocaeli Üniversitesi)": (40.8203, 29.9261)  # Merkez
    }
    
    def __init__(self):
        self._distance_cache: Dict[Tuple[str, str], float] = {}
        self._route_cache: Dict[Tuple[str, str], List[Tuple[float, float]]] = {}
    
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """İki nokta arası kuş uçuşu mesafe (km) - sadece karşılaştırma için"""
        R = 6371  # Dünya yarıçapı km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def get_road_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, Optional[str]]:
        """
        Gerçek yol mesafesi (km) ve rota geometrisi
        
        İşlem akışı:
        1. OSRM API'den ham koordinatları al
        2. Douglas-Peucker ile sadeleştir
        3. İnterpolasyon uygula
        4. GeoJSON'a çevir
        """
        try:
            # OSRM + kendi algoritmalarımız ile rota hesapla
            coords, distance = route_processor.process_route((lat1, lon1), (lat2, lon2))
            
            if coords:
                geometry = calculate_route_geometry(coords)
                return distance, geometry
        except Exception as e:
            print(f"Route processing hatası: {e}")
        
        # Fallback: Yerel graf algoritması
        coords, distance = road_network.get_route_between_stations(lat1, lon1, lat2, lon2)
        if coords:
            geometry = calculate_route_geometry(coords)
            return distance, geometry
        
        # Son çare: Haversine * 1.3 (yol düzeltme faktörü)
        haversine = self.haversine_distance(lat1, lon1, lat2, lon2)
        return haversine * 1.3, None
    
    def get_distance_between_stations(self, station1_name: str, station2_name: str) -> float:
        """İki istasyon arası mesafe"""
        cache_key = (station1_name, station2_name)
        reverse_key = (station2_name, station1_name)
        
        if cache_key in self._distance_cache:
            return self._distance_cache[cache_key]
        if reverse_key in self._distance_cache:
            return self._distance_cache[reverse_key]
        
        coord1 = self.KOCAELI_DISTRICTS.get(station1_name)
        coord2 = self.KOCAELI_DISTRICTS.get(station2_name)
        
        if not coord1 or not coord2:
            return 0
        
        distance, _ = self.get_road_distance(coord1[0], coord1[1], coord2[0], coord2[1])
        self._distance_cache[cache_key] = distance
        
        return distance
    
    def calculate_distance_matrix(self, stations: List[Dict]) -> List[List[float]]:
        """İstasyonlar arası mesafe matrisi oluştur"""
        n = len(stations)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(i + 1, n):
                coords_i, dist = road_network.get_route_between_stations(
                    stations[i]["latitude"], stations[i]["longitude"],
                    stations[j]["latitude"], stations[j]["longitude"]
                )
                
                matrix[i][j] = dist
                matrix[j][i] = dist
        
        return matrix
    
    def get_route_geometry(self, coordinates: List[Tuple[float, float]]) -> Optional[str]:
        """
        Birden fazla nokta için rota geometrisi al
        
        İşlem akışı:
        1. Her segment için OSRM'den ham koordinatları al
        2. Douglas-Peucker ile sadeleştir
        3. Bezier yumuşatma uygula
        4. GeoJSON'a çevir
        """
        if len(coordinates) < 2:
            return None
        
        try:
            # OSRM + kendi algoritmalarımız ile çoklu durak rotası
            return route_processor.get_route_geometry(coordinates)
        except Exception as e:
            print(f"Multi-stop route hatası: {e}")
        
        # Fallback: Yerel graf algoritması
        all_coords, total_distance = road_network.get_multi_stop_route(coordinates)
        
        if all_coords:
            return calculate_route_geometry(all_coords)
        
        # Son çare: Düz çizgi
        return calculate_route_geometry(coordinates)

# Global instance
distance_service = DistanceService()
