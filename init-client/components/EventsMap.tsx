import { type Theme } from '@/constants/theme';
import { shared, useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';

interface MapEvent {
  id: string;
  name: string;
  theme: string;
  location?: string;
  image: string;
  participants: number;
  maxParticipants: number;
  orgaName?: string;
  orgaLogo?: string;
}

interface EventsMapProps {
  events: MapEvent[];
}

interface GeocodedEvent extends MapEvent {
  latitude: number;
  longitude: number;
}

const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache[location] !== undefined) {
    return geocodeCache[location];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'InitApp/1.0' } }
    );
    const results = await response.json();
    if (results.length > 0) {
      const result = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      geocodeCache[location] = result;
      return result;
    }
  } catch (error) {
    console.error('Geocoding error for', location, error);
  }

  geocodeCache[location] = null;
  return null;
}

export function EventsMap({ events }: EventsMapProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mapRef = useRef<MapView>(null);

  const [geocodedEvents, setGeocodedEvents] = useState<GeocodedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const results: GeocodedEvent[] = [];
      const eventsWithLocation = events.filter((e) => e.location);

      await Promise.all(
        eventsWithLocation.map(async (event) => {
          const coords = await geocodeLocation(event.location!);
          if (coords) {
            results.push({ ...event, latitude: coords.lat, longitude: coords.lng });
          }
        })
      );

      setGeocodedEvents(results);
      setLoading(false);

      if (results.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(
          results.map((e) => ({ latitude: e.latitude, longitude: e.longitude })),
          { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
        );
      }
    };

    geocodeAll();
  }, [events]);

  const getThemeColor = (eventTheme: string) => {
    return shared.eventTheme[eventTheme.toLowerCase()] || shared.eventTheme['général'];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  if (geocodedEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="map" size={48} color={theme.colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Aucun événement localisé</Text>
        <Text style={styles.emptyText}>
          Les événements avec un lieu seront affichés sur la carte.
        </Text>
      </View>
    );
  }

  const initialRegion: Region = {
    latitude: 46.603354,
    longitude: 1.888334,
    latitudeDelta: 8,
    longitudeDelta: 8,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {geocodedEvents.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            pinColor={getThemeColor(event.theme)}
          >
            <Callout onPress={() => router.push(`/events/${event.id}` as any)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={1}>{event.name}</Text>
                <Text style={styles.calloutSubtitle}>
                  {event.participants}/{event.maxParticipants} participants
                </Text>
                {event.location && (
                  <Text style={styles.calloutLocation} numberOfLines={1}>{event.location}</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: theme.colors.mutedForeground },
    emptyContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 8,
    },
    emptyTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 16, color: theme.colors.foreground },
    emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center' },
    callout: { width: 200, padding: 4 },
    calloutTitle: { fontWeight: '600', fontSize: 14, marginBottom: 2 },
    calloutSubtitle: { fontSize: 12, color: '#666' },
    calloutLocation: { fontSize: 11, color: '#999', marginTop: 2 },
  });
