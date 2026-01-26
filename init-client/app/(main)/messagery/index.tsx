import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export interface Match {
  id: string;
  name: string;
  age: number;
  eventName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: boolean;
}

export default function MessageryScreen() {
  const router = useRouter();

  const matches: Match[] = [
    {
      id: '1',
      name: 'Marie',
      age: 25,
      eventName: 'Soirée Jazz',
      lastMessage: 'Super soirée hier !',
      lastMessageTime: '14:30',
      unread: true,
    },
    {
      id: '2',
      name: 'Thomas',
      age: 28,
      eventName: 'Concert Rock',
      lastMessage: 'À bientôt !',
      lastMessageTime: 'Hier',
    },
    {
      id: '3',
      name: 'Sophie',
      age: 26,
      eventName: 'Soirée Paris',
      lastMessage: 'Merci pour cette belle soirée',
      lastMessageTime: '2j',
      unread: true,
    },
  ];

  return (
    <ScrollView
      style={styles.matchesContainer}
      contentContainerStyle={styles.matchesContent}
    >
      <View style={styles.matchesPadding}>
        <Text style={styles.matchesTitle}>Vos Matchs</Text>

        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Aucun match pour le moment. Participez à des événements pour rencontrer de nouvelles
              personnes !
            </Text>
          </View>
        ) : (
          <View style={styles.matchesList}>
            {matches.map((match) => (
              <TouchableOpacity
                key={match.id}
                onPress={() => router.push(`/messagery/${match.id}`)}
                style={styles.matchCard}
              >
                <View style={styles.matchCardContent}>
                  <View style={styles.matchAvatar}>
                    <Text style={styles.matchAvatarText}>
                      {match.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.matchInfo}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchName}>
                        {match.name}, {match.age}
                      </Text>
                      {match.lastMessageTime && (
                        <Text style={styles.matchTime}>
                          {match.lastMessageTime}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.matchEvent}>
                      Match via {match.eventName}
                    </Text>
                    {match.lastMessage && (
                      <Text
                        style={[
                          styles.matchLastMessage,
                          match.unread && styles.matchLastMessageUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {match.lastMessage}
                      </Text>
                    )}
                  </View>
                  {match.unread && <View style={styles.unreadBadge} />}
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
  matchesContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  matchesContent: {
    paddingBottom: 80,
  },
  matchesPadding: {
    padding: 16,
  },
  matchesTitle: {
    fontWeight: '600',
    fontSize: 20,
    color: '#303030',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#9E9E9E',
    textAlign: 'center',
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAvatarText: {
    color: '#303030',
    fontWeight: '600',
  },
  matchInfo: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matchName: {
    fontWeight: '600',
    color: '#303030',
  },
  matchTime: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  matchEvent: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  matchLastMessage: {
    fontSize: 14,
    color: '#757575',
  },
  matchLastMessageUnread: {
    fontWeight: '500',
    color: '#303030',
  },
  unreadBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#303030',
    marginTop: 4,
  },
});
