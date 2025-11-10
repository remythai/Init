import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { EventsList, Event } from '@/components/EventsList';
import { router } from 'expo-router';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    name: 'Soirée Jazz au Sunset',
    theme: 'musique',
    date: '15 Nov 2025, 20h00',
    location: 'Le Sunset, Paris',
    participants: 45,
    maxParticipants: 60,
    image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800',
    description: 'Une soirée jazz exceptionnelle',
    isRegistered: true,
  },
  {
    id: '2',
    name: 'Networking Tech Startups',
    theme: 'professionnel',
    date: '18 Nov 2025, 18h30',
    location: 'Station F, Paris',
    participants: 120,
    maxParticipants: 150,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    description: 'Rencontrez des entrepreneurs tech',
    isRegistered: false,
  },
  {
    id: '3',
    name: 'Soirée étudiante ESCP',
    theme: 'étudiant',
    date: '20 Nov 2025, 21h00',
    location: 'Campus ESCP, Paris',
    participants: 200,
    maxParticipants: 250,
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800',
    description: 'La plus grande soirée étudiante du mois',
    isRegistered: true,
  },
  {
    id: '4',
    name: 'Match de Football 5v5',
    theme: 'sport',
    date: '22 Nov 2025, 19h00',
    location: 'Urban Soccer, Paris 15',
    participants: 8,
    maxParticipants: 10,
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    description: 'Match amical entre amis',
    isRegistered: false,
  },
  {
    id: '5',
    name: 'Brunch du Dimanche',
    theme: 'café',
    date: '24 Nov 2025, 11h00',
    location: 'Café Kitsuné, Paris',
    participants: 15,
    maxParticipants: 20,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    description: 'Brunch convivial et détente',
    isRegistered: false,
  },
  {
    id: '6',
    name: 'Fête Masquée de Noël',
    theme: 'fête',
    date: '25 Nov 2025, 22h00',
    location: 'Le Rex Club, Paris',
    participants: 180,
    maxParticipants: 300,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    description: 'Soirée masquée électro',
    isRegistered: true,
  },
];

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // TODO: Remplacez par votre appel API
        // const response = await fetch('https://api.example.com/events');
        // const data = await response.json();
        // setEvents(data);
        
        setEvents(MOCK_EVENTS);
      } catch (error) {
        console.error('Erreur lors du chargement des événements:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleEventClick = (event: Event) => {
    router.push(`/(main)/events/${event.id}`);
  };

  const handleEnterEvent = (event: Event) => {
    router.push(`/(main)/events/${event.id}/(event-tabs)/swiper`);
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
      onEventClick={handleEventClick}
      onEnterEvent={handleEnterEvent}
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