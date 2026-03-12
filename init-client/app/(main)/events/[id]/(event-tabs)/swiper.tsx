// app/(main)/events/[id]/(event-tabs)/swiper.tsx
import { View, StyleSheet, Text } from "react-native";
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { EventSwiper } from "@/components/EventSwiper";
import { useCallback, useEffect, useState } from 'react';
import { useEvent } from '@/context/EventContext';

export default function SwiperScreen() {
  const { id: eventIdParam } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { currentEventId, setCurrentEventId } = useEvent();
  
  // ✅ Priorité : params d'URL > context
  const eventId = eventIdParam ? parseInt(eventIdParam) : currentEventId || 0;
  const [matchCount, setMatchCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigation = useNavigation();

  // Reload profiles when tab regains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setRefreshKey(k => k + 1);
    });
    return unsubscribe;
  }, [navigation]);

  // Synchroniser le context avec l'URL au montage
  useEffect(() => {
    if (eventId && eventId !== currentEventId) {
      setCurrentEventId(eventId);
    }
  }, [eventId, currentEventId, setCurrentEventId]);

  if (!eventId || isNaN(eventId)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.errorText}>ID événement manquant</Text>
        <Text style={styles.errorSubtext}>eventIdParam: {eventIdParam}</Text>
        <Text style={styles.errorSubtext}>currentEventId: {currentEventId}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <EventSwiper
        eventId={eventId}
        refreshKey={refreshKey}
        onMatch={() => {
          setMatchCount(c => c + 1);
          setCurrentEventId(eventId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'transparent',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
});