// app/(main)/events/[id]/(event-tabs)/messagery/index.tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useEvent } from '@/context/EventContext';
import { matchService } from '@/services/match.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function getPhotoUri(filePath?: string): string | null {
  if (!filePath) return null;
  return filePath.startsWith('http') ? filePath : `${API_URL}${filePath}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function EventMessageryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id: eventIdParam } = useLocalSearchParams<{ id: string }>();
  const { currentEventId, setCurrentEventId } = useEvent();
  const eventId = eventIdParam ? parseInt(eventIdParam) : currentEventId || 0;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (eventId && eventId !== currentEventId) {
        setCurrentEventId(eventId);
      }
      if (!eventId) {
        setLoading(false);
        return;
      }
      const loadConversations = async () => {
        try {
          setLoading(true);
          const data = await matchService.getEventConversations(String(eventId));
          setConversations(data?.conversations || []);
        } catch (error: any) {
          console.error('❌ Conversations error:', error.message);
          setConversations([]);
        } finally {
          setLoading(false);
        }
      };
      loadConversations();
    }, [eventId])
  );

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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="chat-bubble-outline" size={48} color={theme.colors.placeholder} />
          </View>
          <Text style={styles.emptyTitle}>Pas encore de matchs</Text>
          <Text style={styles.emptySub}>Commencez à swiper pour matcher avec d'autres participants !</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {conversations.map((conv) => {
            const photo = conv.user?.photos?.[0]?.file_path
              ? getPhotoUri(conv.user.photos[0].file_path)
              : null;
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
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {conv.user?.firstname?.[0] || '?'}
                      </Text>
                    </View>
                  )}
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
  loadingText: { marginTop: 12, color: theme.colors.placeholder, fontSize: 14 },

  header: {
    backgroundColor: theme.colors.foreground,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.primaryForeground },
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
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 20, fontWeight: '700', color: theme.colors.foreground },
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

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: theme.colors.foreground, marginBottom: 8 },
  emptySub: { fontSize: 14, color: theme.colors.placeholder, textAlign: 'center', lineHeight: 20 },

  errorText: { color: theme.colors.destructive, fontSize: 15, marginBottom: 16 },
  errorButton: { backgroundColor: theme.colors.foreground, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  errorButtonText: { color: theme.colors.primaryForeground, fontWeight: '600' },
});
