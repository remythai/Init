// app/(main)/messagery/index.tsx
// Messagerie globale — toutes conversations de tous les événements
import { useEvent } from '@/context/EventContext';
import { matchService, Conversation } from '@/services/match.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface EventConversations {
  event: { id: number; name: string };
  conversations: Conversation[];
}

function getPhotoUri(photos?: { file_path: string }[]): string | null {
  if (photos && photos.length > 0 && photos[0].file_path) {
    const p = photos[0].file_path;
    return p.startsWith('http') ? p : `${API_URL}${p}`;
  }
  return null;
}

function Avatar({ photos, firstname, lastname, size = 48 }: {
  photos?: { file_path: string }[];
  firstname: string;
  lastname: string;
  size?: number;
}) {
  const uri = getPhotoUri(photos);
  const initials = `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarFallbackText, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Hier';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function GlobalMessageryScreen() {
  const router = useRouter();
  const { setCurrentEventId } = useEvent();

  const [eventGroups, setEventGroups] = useState<EventConversations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  useEffect(() => { load(); }, []);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await matchService.getAllConversations();
      setEventGroups(data || []);
    } catch {
      setEventGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleCollapse = (eventId: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleConvPress = (conv: Conversation, eventId: number) => {
    setCurrentEventId(eventId);
    router.push(`/(main)/events/${eventId}/(event-tabs)/messagery/${conv.match_id}?from=global`);
  };

  const totalUnread = eventGroups.reduce((sum, g) =>
    sum + g.conversations.reduce((s, c) => s + (c.unread_count || 0), 0), 0
  );

  const totalConvs = eventGroups.reduce((sum, g) => sum + g.conversations.length, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1271FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={styles.unreadTotal}>
              <Text style={styles.unreadTotalText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>
          {totalConvs} conversation{totalConvs !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1271FF" />
        }
      >
        {eventGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="chat-bubble-outline" size={44} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>Pas encore de matchs</Text>
            <Text style={styles.emptySubtitle}>
              Inscrivez-vous à des événements et commencez à swiper !
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/(main)/events')}>
              <Text style={styles.emptyBtnText}>Voir les événements</Text>
            </Pressable>
          </View>
        ) : (
          eventGroups.map(group => {
            const isCollapsed = collapsed.has(group.event.id);
            const groupUnread = group.conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

            return (
              <View key={group.event.id} style={styles.group}>
                {/* Event header */}
                <Pressable
                  style={styles.groupHeader}
                  onPress={() => toggleCollapse(group.event.id)}
                  android_ripple={{ color: '#e5e7eb' }}
                >
                  <View style={styles.groupHeaderLeft}>
                    <Text style={styles.groupName} numberOfLines={1}>{group.event.name}</Text>
                    <View style={styles.groupCount}>
                      <Text style={styles.groupCountText}>{group.conversations.length}</Text>
                    </View>
                    {groupUnread > 0 && (
                      <View style={styles.groupUnread}>
                        <Text style={styles.groupUnreadText}>{groupUnread}</Text>
                      </View>
                    )}
                  </View>
                  <MaterialIcons
                    name={isCollapsed ? 'keyboard-arrow-down' : 'keyboard-arrow-up'}
                    size={22}
                    color="#9ca3af"
                  />
                </Pressable>

                {/* Conversations */}
                {!isCollapsed && (
                  <View style={styles.convList}>
                    {group.conversations.map((conv, idx) => {
                      const isBlocked = conv.is_blocked || conv.is_other_user_blocked;
                      const hasUnread = (conv.unread_count || 0) > 0 && !isBlocked;
                      const lastMsg = conv.last_message;
                      const isLast = idx === group.conversations.length - 1;

                      return (
                        <Pressable
                          key={conv.match_id}
                          style={[styles.convRow, isBlocked && { opacity: 0.5 }, !isLast && styles.convRowBorder]}
                          onPress={() => handleConvPress(conv, group.event.id)}
                          android_ripple={{ color: '#f9fafb' }}
                        >
                          {/* Avatar + badge */}
                          <View style={styles.avatarWrapper}>
                            <Avatar
                              photos={conv.user?.photos}
                              firstname={conv.user?.firstname || '?'}
                              lastname={conv.user?.lastname || ''}
                              size={48}
                            />
                            {hasUnread && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                  {conv.unread_count! > 9 ? '9+' : conv.unread_count}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Info */}
                          <View style={styles.convInfo}>
                            <View style={styles.convRow1}>
                              <Text
                                style={[styles.convName, hasUnread && styles.convNameUnread]}
                                numberOfLines={1}
                              >
                                {conv.user?.firstname} {conv.user?.lastname?.charAt(0)}.
                              </Text>
                              {lastMsg && (
                                <Text style={styles.convTime}>{formatTime(lastMsg.sent_at)}</Text>
                              )}
                            </View>
                            <View style={styles.convRow2}>
                              <Text
                                style={[styles.convLastMsg, hasUnread && styles.convLastMsgUnread]}
                                numberOfLines={1}
                              >
                                {isBlocked
                                  ? (conv.is_blocked ? 'Retiré de l\'événement' : 'Utilisateur retiré')
                                  : lastMsg
                                    ? (lastMsg.is_mine ? `Vous : ${lastMsg.content}` : lastMsg.content)
                                    : 'Nouveau match ! Dites bonjour 👋'}
                              </Text>
                              {hasUnread && <View style={styles.unreadDot} />}
                            </View>
                          </View>

                          <MaterialIcons name="chevron-right" size={18} color="#d1d5db" />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 22, color: '#303030' },
  headerSub: { fontSize: 13, color: '#9ca3af' },
  unreadTotal: { backgroundColor: '#1271FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadTotalText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 16, color: '#303030', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: { backgroundColor: '#1271FF', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 24 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  // Groups
  group: { marginTop: 10, backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  groupName: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#303030', flex: 1 },
  groupCount: { backgroundColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  groupCountText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  groupUnread: { backgroundColor: '#1271FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  groupUnreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  // Conversations
  convList: {},
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  convRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  avatarWrapper: { position: 'relative' },
  avatarFallback: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontWeight: '700', color: '#6b7280' },
  unreadBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#1271FF', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#fff' },
  unreadBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  convInfo: { flex: 1, gap: 2 },
  convRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 14, fontWeight: '500', color: '#303030', flex: 1, marginRight: 6 },
  convNameUnread: { fontWeight: '700' },
  convTime: { fontSize: 11, color: '#9ca3af' },
  convLastMsg: { fontSize: 13, color: '#9ca3af', flex: 1 },
  convLastMsgUnread: { color: '#303030', fontWeight: '600' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#1271FF', marginLeft: 4 },
});