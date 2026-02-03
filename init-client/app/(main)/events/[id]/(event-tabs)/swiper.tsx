// app/(main)/events/[id]/(event-tabs)/swiper.tsx
import { View, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventSwiper } from "@/components/EventSwiper";
import { useEffect, useState } from 'react';
import { useEvent } from '@/context/EventContext';

export default function SwiperScreen() {
  const { id: eventIdParam } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentEventId, setCurrentEventId } = useEvent();
  
  // ✅ Priorité : params d'URL > context
  const eventId = eventIdParam ? parseInt(eventIdParam) : currentEventId || 0;
  const [matchCount, setMatchCount] = useState(0);

  console.log('🔍 Swiper - eventIdParam:', eventIdParam, 'currentEventId:', currentEventId, 'eventId:', eventId);

  // ✅ Synchroniser le context avec l'URL au montage
  useEffect(() => {
    if (eventId && eventId !== currentEventId) {
      console.log('🔄 Swiper: Syncing context with eventId:', eventId);
      setCurrentEventId(eventId);
    }
  }, [eventId, currentEventId, setCurrentEventId]);

  if (!eventId || isNaN(eventId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>ID événement manquant</Text>
        <Text style={styles.errorSubtext}>eventIdParam: {eventIdParam}</Text>
        <Text style={styles.errorSubtext}>currentEventId: {currentEventId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EventSwiper
        eventId={eventId}
        onMatch={() => {
          console.log("🎉 NOUVEAU MATCH ! event:", eventId);
          setMatchCount(c => c + 1);
          
          // ✅ S'assurer que le context est à jour avant de naviguer
          setCurrentEventId(eventId);
          
          // ✅ Navigation avec l'ID explicite dans l'URL
          router.push(`/(main)/events/${eventId}/(event-tabs)/messagery`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5',
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