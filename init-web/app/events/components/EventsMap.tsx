"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

// Theme colors for markers
const THEME_COLORS: Record<string, string> = {
  professionnel: "#1271FF",
  soiree: "#F43F5E",
  sport: "#10B981",
  culture: "#8B5CF6",
  gaming: "#F59E0B",
  autre: "#6B7280",
};

function getThemeColor(theme: string): string {
  return THEME_COLORS[theme.toLowerCase()] || THEME_COLORS.autre;
}

function createCustomIcon(theme: string, count?: string): L.DivIcon {
  const color = getThemeColor(theme);
  return L.divIcon({
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
    html: `
      <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
          <path d="M18 0C8.06 0 0 7.84 0 17.5C0 30.63 18 44 18 44S36 30.63 36 17.5C36 7.84 27.94 0 18 0Z" fill="${color}"/>
          <circle cx="18" cy="17" r="8" fill="white" opacity="0.95"/>
        </svg>
        <span style="position:absolute;top:9px;left:0;right:0;text-align:center;font-size:10px;font-weight:700;color:${color};line-height:16px">${count || ""}</span>
      </div>
    `,
  });
}

// Auto-fit map bounds to markers
function FitBounds({ events }: { events: MapEvent[] }) {
  const map = useMap();
  const lastKey = useRef("");

  useEffect(() => {
    if (events.length === 0) return;

    // Build a stable key from event ids to avoid re-fitting on every render
    const key = events.map((e) => e.id).sort().join(",");
    if (key === lastKey.current) return;
    lastKey.current = key;

    if (events.length === 1) {
      map.setView([events[0].lat, events[0].lng], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(events.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
  }, [events, map]);

  return null;
}

export interface MapEvent {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  theme: string;
  participants: number;
  maxParticipants: number;
  image?: string;
}

interface EventsMapProps {
  events: MapEvent[];
  onEventClick: (eventId: string) => void;
}

export default function EventsMap({ events, onEventClick }: EventsMapProps) {
  const defaultCenter: [number, number] =
    events.length > 0 ? [events[0].lat, events[0].lng] : [46.603354, 1.888334];
  const defaultZoom = events.length > 0 ? 12 : 6;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full rounded-xl z-0"
      style={{ minHeight: "500px" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds events={events} />
      {events.map((event) => {
        const fillPct = Math.round(
          (event.participants / event.maxParticipants) * 100
        );
        return (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={createCustomIcon(event.theme, `${event.participants}`)}
          >
            <Popup closeButton={false} className="custom-map-popup">
              <div
                className="cursor-pointer w-[220px] overflow-hidden rounded-xl bg-white shadow-lg"
                onClick={() => onEventClick(event.id)}
              >
                {event.image && (
                  <div className="relative h-24 w-full">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: getThemeColor(event.theme) }}
                    >
                      {event.theme}
                    </div>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm text-[#303030] leading-tight mb-1.5 line-clamp-1">
                    {event.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mb-2 line-clamp-1">
                    {event.location}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${fillPct}%`,
                          backgroundColor: getThemeColor(event.theme),
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 whitespace-nowrap">
                      {event.participants}/{event.maxParticipants}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
