import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Fix default marker icon (Leaflet has issues with bundlers)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

/**
 * MapPicker — Leaflet map for picking lat/lng
 * @param {number} initialLat
 * @param {number} initialLng
 * @param {function} onChange(lat, lng) — called when marker moved or map clicked
 * @param {number} radius — optional radius circle (meters)
 */
export function MapPicker({ initialLat = -6.2088, initialLng = 106.8456, onChange, radius = 0, height = '300px' }) {
  const { toast, error } = useToast();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const containerRef = useRef(null);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([initialLat, initialLng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    if (radius > 0) {
      const circle = L.circle([initialLat, initialLng], {
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.1,
        radius,
      }).addTo(map);
      circleRef.current = circle;
    }

    // Click to set marker
    map.on('click', (e) => {
      const { lat: clat, lng: clng } = e.latlng;
      marker.setLatLng([clat, clng]);
      setLat(clat);
      setLng(clng);
      if (circleRef.current) circleRef.current.setLatLng([clat, clng]);
      onChange?.(clat, clng);
    });

    // Drag marker
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      if (circleRef.current) circleRef.current.setLatLng([pos.lat, pos.lng]);
      onChange?.(pos.lat, pos.lng);
    });

    // Prevent map from intercepting page scroll when not focused
    map.scrollWheelZoom.disable();
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []); // eslint-disable-line

  // Update marker position when initialLat/initialLng changes
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([initialLat, initialLng]);
      mapRef.current.setView([initialLat, initialLng]);
      if (circleRef.current) circleRef.current.setLatLng([initialLat, initialLng]);
      setLat(initialLat);
      setLng(initialLng);
    }
  }, [initialLat, initialLng]);

  // Search address via Nominatim
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat: slat, lng: slng } = data[0];
        markerRef.current.setLatLng([slat, slng]);
        mapRef.current.setView([slat, slng], 16);
        if (circleRef.current) circleRef.current.setLatLng([slat, slng]);
        setLat(slat);
        setLng(slng);
        onChange?.(slat, slng);
      } else {
        toast('Lokasi tidak ditemukan', 'warning');
      }
    } catch (err) {
      error('Gagal mencari lokasi: ' + err.message);
    }
  };

  // Manual input
  const handleManualInput = (field, value) => {
    const newLat = field === 'lat' ? value : lat;
    const newLng = field === 'lng' ? value : lng;
    setLat(newLat);
    setLng(newLng);
    markerRef.current?.setLatLng([newLat, newLng]);
    mapRef.current?.setView([newLat, newLng]);
    if (circleRef.current) circleRef.current.setLatLng([newLat, newLng]);
    onChange?.(newLat, newLng);
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari alamat... (contoh: Monas Jakarta)"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-sm font-medium">
          Cari
        </button>
      </form>

      {/* Map */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 z-0"
      />

      {/* Manual input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={e => handleManualInput('lat', parseFloat(e.target.value))}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={e => handleManualInput('lng', parseFloat(e.target.value))}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <MapPin className="w-3 h-3" />
        Klik map / drag marker / cari alamat untuk set lokasi
      </div>
    </div>
  );
}
