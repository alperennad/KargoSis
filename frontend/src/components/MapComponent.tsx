import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Station, Route } from '../types';

interface MapComponentProps {
  stations: Station[];
  routes?: Route[];
  highlightStationId?: number;
  showAllStations?: boolean;
  onStationClick?: (station: Station) => void;
}

// Özel marker ikonları
const createIcon = (color: string, isHQ: boolean = false) => {
  const size = isHQ ? 24 : 18;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${isHQ ? 'transform: scale(1.2);' : ''}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const stationIcon = createIcon('#d4822e');
const headquartersIcon = createIcon('#10b981', true);
const highlightIcon = createIcon('#ef4444');

// Rota renkleri
const routeColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export default function MapComponent({
  stations,
  routes = [],
  highlightStationId,
  showAllStations = true,
  onStationClick,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Haritayı oluştur
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.78, 29.7], // Kocaeli merkez
        zoom: 10,
        zoomControl: true,
      });

      // Tile layer - Koyu tema
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Önceki marker ve polyline'ları temizle
    markersRef.current.forEach((marker) => marker.remove());
    polylinesRef.current.forEach((polyline) => polyline.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    // İstasyonları ekle
    if (showAllStations) {
      stations.forEach((station) => {
        let icon = stationIcon;
        if (station.is_headquarters) {
          icon = headquartersIcon;
        } else if (station.id === highlightStationId) {
          icon = highlightIcon;
        }

        const marker = L.marker([station.latitude, station.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'Outfit', sans-serif; padding: 4px;">
              <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #f1f5f9;">
                ${station.name}
              </h3>
              ${station.is_headquarters ? '<span style="color: #10b981; font-size: 12px;">Merkez</span>' : ''}
              ${station.cargo_count !== undefined ? `
                <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                  Kargo: ${station.cargo_count} adet<br/>
                  Ağırlık: ${station.total_weight?.toFixed(1)} kg
                </p>
              ` : ''}
            </div>
          `);

        if (onStationClick) {
          marker.on('click', () => onStationClick(station));
        }

        markersRef.current.push(marker);
      });
    }

    // Rotaları çiz
    routes.forEach((route, index) => {
      if (!route.stops || route.stops.length < 2) return;

      const color = routeColors[index % routeColors.length];
      
      // Route geometry varsa kullan, yoksa düz çizgi
      if (route.route_geometry) {
        try {
          const geometry = JSON.parse(route.route_geometry);
          if (geometry.coordinates) {
            const latlngs = geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            const polyline = L.polyline(latlngs, {
              color,
              weight: 4,
              opacity: 0.8,
              dashArray: undefined,
            }).addTo(map);
            polylinesRef.current.push(polyline);
          }
        } catch {
          // Geometry parse hatası, düz çizgi kullan
          drawStraightLine(route, color, map);
        }
      } else {
        drawStraightLine(route, color, map);
      }

      // Rota üzerindeki istasyonları işaretle
      route.stops.forEach((stop, stopIndex) => {
        const marker = L.circleMarker([stop.station.latitude, stop.station.longitude], {
          radius: 8,
          fillColor: color,
          color: 'white',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: 'Outfit', sans-serif; padding: 4px;">
              <span style="color: ${color}; font-size: 12px; font-weight: 600;">
                Durak ${stopIndex + 1}
              </span>
              <h3 style="font-weight: 600; font-size: 14px; color: #f1f5f9;">
                ${stop.station.name}
              </h3>
              <p style="font-size: 12px; color: #94a3b8;">
                Kargo: ${stop.cargo_count} adet, ${stop.cargo_weight.toFixed(1)} kg
              </p>
            </div>
          `);
        markersRef.current.push(marker as unknown as L.Marker);
      });
    });

    // Haritayı tüm marker'lara sığdır
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    function drawStraightLine(route: Route, color: string, map: L.Map) {
      if (!route.stops) return;
      const points = route.stops.map((stop) => [stop.station.latitude, stop.station.longitude] as L.LatLngTuple);
      const polyline = L.polyline(points, {
        color,
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(map);
      polylinesRef.current.push(polyline);
    }

    return () => {
      // Cleanup markers and polylines
      markersRef.current.forEach((marker) => marker.remove());
      polylinesRef.current.forEach((polyline) => polyline.remove());
    };
  }, [stations, routes, highlightStationId, showAllStations, onStationClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full min-h-[400px]" />;
}

