'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Search, Crosshair } from 'lucide-react';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface LocationPickerProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const VE_CENTER: [number, number] = [7.5, -66.0];

export default function LocationPicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Busca una dirección o ciudad...',
}: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Coordenadas actuales
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=es`
      );
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const select = (s: Suggestion) => {
    const newLat = parseFloat(s.lat);
    const newLng = parseFloat(s.lon);
    setQuery(s.display_name);
    setLat(newLat);
    setLng(newLng);
    setMapCenter([newLat, newLng]);
    onChange(s.display_name, newLat, newLng);
    setOpen(false);
    setSuggestions([]);
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setMapCenter([latitude, longitude]);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
          );
          const data = await res.json();
          const addr = data.display_name || `${latitude}, ${longitude}`;
          setQuery(addr);
          onChange(addr, latitude, longitude);
        } catch {
          onChange(`${latitude}, ${longitude}`, latitude, longitude);
        }
      },
      () => {}
    );
  };

  const handleMarkerDrag = async (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setMapCenter([newLat, newLng]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&accept-language=es`
      );
      const data = await res.json();
      const addr = data.display_name || `${newLat}, ${newLng}`;
      setQuery(addr);
      onChange(addr, newLat, newLng);
    } catch {
      onChange(`${newLat}, ${newLng}`, newLat, newLng);
    }
  };

  const showMap = mapCenter !== null;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative flex">
        <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
          <MapPin size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="form-input"
          style={{ paddingLeft: '2.25rem', paddingRight: '2.75rem' }}
        />
        <button
          type="button"
          onClick={getUserLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: 'var(--color-primary)' }}
          title="Usar mi ubicación"
          disabled={disabled}
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Crosshair size={16} />
          )}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-modal overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => select(s)}
                className="w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-green-50 border-b last:border-b-0"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <Search size={12} className="inline mr-1.5" style={{ color: 'var(--color-text-muted)' }} />
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showMap && (
        <div className="mt-2 rounded-xl overflow-hidden border animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
          <MapView
            center={mapCenter}
            markerPosition={mapCenter}
            onMarkerDrag={handleMarkerDrag}
          />
        </div>
      )}
    </div>
  );
}
