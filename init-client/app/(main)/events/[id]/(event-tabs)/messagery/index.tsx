// app/(main)/events/[id]/(event-tabs)/messagery/index.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { matchService, Match } from '@/services/match.service';
import { useEvent } from '@/context/EventContext';

export default function EventMessageryScreen() {
  const router = useRouter();
  const { id: eventIdParam } = useLocalSearchParams<{ id: string }>();
  const { currentEventId, setCurrentEventId } = useEvent();
  
  // ✅ Priorité : params d'URL > context
  const eventId = eventIdParam ? parseInt(eventIdParam) : currentEventId || 0;
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('📨 Messagery index - eventIdParam:', eventIdParam, 'currentEventId:', currentEventId, 'eventId:', eventId);

  // ✅ Synchroniser le context avec l'URL
  useEffect(() => {
    if (eventId && eventId !== currentEventId) {
      console.log('🔄 Syncing context eventId:', eventId);
      setCurrentEventId(eventId);
    }
  }, [eventId, currentEventId, setCurrentEventId]);

  useEffect(() => {
    if (!eventId) {
      console.warn('⚠️ No eventId in messagery/index');
      setLoading(false);
      return;
    }

    const loadMatches = async () => {
      try {
        console.log('📡 Loading matches for event:', eventId);
        setLoading(true);
        const data = await matchService.getEventMatches(eventId);
        console.log('✅ Matches loaded:', data?.length || 0);
        setMatches(data || []);
      } catch (error: any) {
        console.error('❌ Matches error:', error.message);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [eventId]);

  const handleMatchPress = (matchId: number) => {
    console.log('💬 Opening chat:', matchId, 'eventId:', eventId);
    // ✅ Navigation avec l'ID explicite dans l'URL
    router.push(`/(main)/events/${eventId}/(event-tabs)/messagery/${matchId}`);
  };

  if (loading) {
    return (
      <ScrollView style={styles.matchesContainer}>
        <View style={styles.matchesPadding}>
          <Text style={styles.matchesTitle}>Chargement event {eventId}...</Text>
        </View>
      </ScrollView>
    );
  }

  if (!eventId) {
    return (
      <ScrollView style={styles.matchesContainer}>
        <View style={styles.matchesPadding}>
          <Text style={styles.matchesTitle}>Erreur: ID événement manquant</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.replace('/(main)/events')}
          >
            <Text style={styles.errorButtonText}>Retour aux événements</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.matchesContainer} contentContainerStyle={styles.matchesContent}>
      <View style={styles.matchesPadding}>
        <Text style={styles.matchesTitle}>Conversations ({matches.length})</Text>
        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="chat-bubble-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyStateText}>Aucun match</Text>
            <Text style={styles.emptySubtitle}>Swipe pour matcher !</Text>
          </View>
        ) : (
          <View style={styles.matchesList}>
            {matches.map((match) => (
              <TouchableOpacity
                key={match.match_id}
                onPress={() => handleMatchPress(match.match_id)}
                style={styles.matchCard}
              >
                <View style={styles.matchCardContent}>
                  <View style={styles.matchAvatar}>
                    <Text style={styles.matchAvatarText}>{match.firstname[0]}{match.lastname[0]}</Text>
                  </View>
                  <View style={styles.matchInfo}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchName}>{match.firstname} {match.lastname}</Text>
                      <Text style={styles.matchTime}>{new Date(match.created_at).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  matchesContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  matchesContent: { paddingBottom: 80 },
  matchesPadding: { padding: 16 },
  matchesTitle: { fontWeight: '600', fontSize: 20, color: '#303030', marginBottom: 16 },
  matchesList: { gap: 12 },
  matchCard: {
    backgroundColor: 'white', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  matchCardContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  matchAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  matchAvatarText: { color: '#303030', fontWeight: '600', fontSize: 16 },
  matchInfo: { flex: 1 },
  matchHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  matchName: { fontWeight: '600', color: '#303030' },
  matchTime: { fontSize: 12, color: '#9E9E9E' },
  matchEvent: { fontSize: 12, color: '#757575', marginBottom: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateText: { color: '#9E9E9E', textAlign: 'center', fontSize: 16, marginTop: 16 },
  emptySubtitle: { color: '#BDBDBD', textAlign: 'center', fontSize: 14, marginTop: 4 },
  errorButton: {
    backgroundColor: '#303030',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});