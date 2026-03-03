"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon paths broken by webpack/Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export interface MapEvent {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  theme: string;
  participants: number;
  maxParticipants: number;
}

interface EventsMapProps {
  events: MapEvent[];
  onEventClick: (eventId: string) => void;
}

export default function EventsMap({ events, onEventClick }: EventsMapProps) {
  const defaultCenter: [number, number] = events.length > 0
    ? [events[0].lat, events[0].lng]
    : [46.603354, 1.888334];

  const defaultZoom = events.length > 0 ? 12 : 6;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full rounded-xl z-0"
      style={{ minHeight: "500px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {events.map((event) => (
        <Marker key={event.id} position={[event.lat, event.lng]}>
          <Popup>
            <div
              className="cursor-pointer min-w-[160px]"
              onClick={() => onEventClick(event.id)}
            >
              <p className="font-semibold text-sm text-[#303030] mb-1">{event.name}</p>
              <p className="text-xs text-gray-500 mb-1">{event.location}</p>
              <p className="text-xs text-gray-500">
                {event.participants}/{event.maxParticipants} participants
              </p>
              <p className="text-xs text-[#1271FF] mt-1.5 font-medium">Voir l&apos;evenement →</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
