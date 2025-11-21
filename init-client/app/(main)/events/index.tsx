// events/index.tsx
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { EventsList, Event } from '@/components/EventsList';
import { router } from 'expo-router';

import { authService } from '@/services/auth.service';
import { eventService } from '@/services/event.service';
import { transformEventResponses } from '@/utils/event.utils';

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"user" | "organizer">("user");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);

      const role = await authService.getUserType();
      setUserType(role === "orga" ? "organizer" : "user");

      if (role === "orga") {
        const orgaEvents = await eventService.getMyOrgaEvents();
        const transformedEvents = transformEventResponses(orgaEvents);
        setEvents(transformedEvents);
      } else {
        const response = await eventService.getPublicEvents({
          upcoming: true,
          limit: 50,
        });
        const transformedEvents = transformEventResponses(response.events);
        setEvents(transformedEvents);
      }

    } catch (error) {
      console.error("Erreur lors du chargement des événements:", error);
      Alert.alert(
        "Erreur",
        "Impossible de charger les événements. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    router.push(`/(main)/events/${event.id}`);
  };

  const handleEnterEvent = (event: Event) => {
    router.push(`/(main)/events/${event.id}/(event-tabs)/swiper`);
  };

  const handleCreateEvent = async () => {
    await loadEvents();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  return (
    <EventsList
      events={events}
      userType={userType}
      onEventClick={handleEventClick}
      onEnterEvent={handleEnterEvent}
      onCreateEvent={handleCreateEvent}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});