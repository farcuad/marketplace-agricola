'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Componente interno: centra el mapa cuando cambia el centro ─────────────
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 || center[1] !== 0) {
      map.flyTo(center, Math.max(10, map.getZoom()), { duration: 0.6 });
    }
  }, [center, map]);
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MapViewProps {
  center: [number, number];
  markerPosition: [number, number];
  onMarkerDrag?: (lat: number, lng: number) => void;
}

// ─── Componente del mapa (solo cliente) ──────────────────────────────────────
export default function MapView({
  center,
  markerPosition,
  onMarkerDrag,
}: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      className="w-full h-48 rounded-xl z-0"
      style={{ border: '1px solid var(--color-border)' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} />
      <Marker
        position={markerPosition}
        draggable={!!onMarkerDrag}
        eventHandlers={
          onMarkerDrag
            ? {
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  onMarkerDrag(pos.lat, pos.lng);
                },
              }
            : undefined
        }
      />
    </MapContainer>
  );
}
