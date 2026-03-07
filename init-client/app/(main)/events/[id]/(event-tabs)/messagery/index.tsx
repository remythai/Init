// app/(main)/events/[id]/(event-tabs)/messagery/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useEvent } from '@/context/EventContext';
import { matchService } from '@/services/match.service';
import { socketService, type SocketConversationUpdate, type SocketMatch } from '@/services/socket.service';
import { useSocket } from '@/context/SocketContext';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function EventMessageryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id: eventIdParam } = useGlobalSearchParams<{ id: string }>();
  const { currentEventId, setCurrentEventId } = useEvent();
  const eventId = eventIdParam ? parseInt(eventIdParam) : currentEventId || 0;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { isConnected } = useSocket();
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const loadConversations = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await matchService.getEventConversations(String(eventId));
      setConversations(data?.conversations || []);
    } catch (error: any) {
      console.error('Conversations error:', error.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      if (eventId && eventId !== currentEventId) {
        setCurrentEventId(eventId);
      }
      loadConversations();
    }, [eventId])
  );

  // Real-time: update conversation list when a new message arrives
  useEffect(() => {
    if (!isConnected) return;

    const unsubConv = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.match_id === data.match_id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          last_message: data.last_message,
          unread_count: (updated[idx].unread_count || 0) + (data.last_message.is_mine ? 0 : 1),
        };
        // Move to top
        const [item] = updated.splice(idx, 1);
        updated.unshift(item);
        return updated;
      });
    });

    const unsubMatch = socketService.onNewMatch((data: SocketMatch) => {
      if (data.event_id !== eventId) return;
      // Reload to get the new conversation
      loadConversations();
    });

    return () => { unsubConv(); unsubMatch(); };
  }, [isConnected, eventId, loadConversations]);

  const handleMatchPress = (matchId: number, conv: any) => {
    router.push(`/(main)/events/${eventId}/(event-tabs)/messagery/${matchId}`);
  };

  if (!eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Erreur: ID événement manquant</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.replace('/(main)/events')}>
          <Text style={styles.errorButtonText}>Retour aux événements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSub}>Vos conversations avec vos matchs</Text>
      </View>

      {loading ? (
        <ScreenLoader />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chat-bubble-outline"
          title="Pas encore de matchs"
          subtitle="Commencez à swiper pour matcher avec d'autres participants !"
        />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {conversations.map((conv) => {
            const isDisabled = conv.is_blocked || conv.is_other_user_blocked;
            const unread = conv.unread_count || 0;

            return (
              <TouchableOpacity
                key={conv.match_id}
                onPress={() => handleMatchPress(conv.match_id, conv)}
                style={[styles.convItem, isDisabled && styles.convItemDisabled]}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={styles.avatarWrapper}>
                  <Avatar
                    firstname={conv.user?.firstname}
                    lastname={conv.user?.lastname}
                    photo={conv.user?.photos?.[0]?.file_path}
                    size={56}
                    bgColor={theme.colors.border}
                  />
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.convInfo}>
                  <View style={styles.convTop}>
                    <Text style={styles.convName} numberOfLines={1}>
                      {conv.user?.firstname} {conv.user?.lastname?.charAt(0)}.
                    </Text>
                    {conv.last_message?.sent_at && (
                      <Text style={styles.convTime}>{formatTime(conv.last_message.sent_at)}</Text>
                    )}
                  </View>
                  <Text
                    style={[styles.convLast, unread > 0 && styles.convLastUnread]}
                    numberOfLines={1}
                  >
                    {conv.last_message
                      ? conv.last_message.is_mine
                        ? `Vous : ${conv.last_message.content}`
                        : conv.last_message.content
                      : "Nouveau match ! Dites bonjour 👋"}
                  </Text>
                </View>

                {/* Arrow */}
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.placeholder} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  header: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.foreground },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },

  list: { flex: 1 },
  listContent: { paddingBottom: 80 },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  convItemDisabled: { opacity: 0.55 },

  avatarWrapper: { position: 'relative' },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 2, borderColor: theme.colors.card,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 11, color: theme.colors.primaryForeground, fontWeight: '700' },

  convInfo: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { fontWeight: '600', color: theme.colors.foreground, fontSize: 15, flex: 1 },
  convTime: { fontSize: 12, color: theme.colors.placeholder, marginLeft: 8 },
  convLast: { fontSize: 13, color: theme.colors.placeholder },
  convLastUnread: { color: theme.colors.foreground, fontWeight: '500' },

  errorText: { color: theme.colors.destructive, fontSize: 15, marginBottom: 16 },
  errorButton: { backgroundColor: theme.colors.foreground, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  errorButtonText: { color: theme.colors.primaryForeground, fontWeight: '600' },
});
