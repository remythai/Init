// app/(main)/events/[id]/statistics/index.tsx
import { eventService, EventStatistics } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color = '#1271FF',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialIcons name={icon} size={18} color="#1271FF" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ProgressBar({ value, color = '#1271FF' }: { value: number; color?: string }) {
  return (
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function LikesBar({ likes, passes, likeRate }: { likes: number; passes: number; likeRate: number }) {
  return (
    <View style={styles.likesBarContainer}>
      <View style={styles.likesBarRow}>
        <View style={[styles.likesBarSegment, { flex: likeRate, backgroundColor: '#22c55e' }]} />
        <View style={[styles.likesBarSegment, { flex: Math.max(100 - likeRate, 0), backgroundColor: '#f87171' }]} />
      </View>
      <View style={styles.likesLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Likes ({likes})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f87171' }]} />
          <Text style={styles.legendText}>Passes ({passes})</Text>
        </View>
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [eventName, setEventName] = useState('');
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const [eventData, statsData] = await Promise.all([
        eventService.getEventById(id),
        eventService.getEventStatistics(id),
      ]);
      setEventName(eventData.name || '');
      setHasWhitelist(eventData.has_whitelist ?? false);
      setStats(statsData);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1271FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#303030" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Statistiques</Text>
          {eventName ? <Text style={styles.headerSub}>{eventName}</Text> : null}
        </View>
        <Pressable onPress={onRefresh} style={styles.headerButton}>
          <MaterialIcons name="refresh" size={22} color="#303030" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1271FF" />}
      >
        {!stats ? (
          <Text style={styles.empty}>Aucune statistique disponible</Text>
        ) : (
          <>
            {/* Summary Banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.participants.total}</Text>
                <Text style={styles.summaryLabel}>Participants</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.matching.total_matches}</Text>
                <Text style={styles.summaryLabel}>Matchs</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.messages.total}</Text>
                <Text style={styles.summaryLabel}>Messages</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{stats.participants.engagement_rate}%</Text>
                <Text style={styles.summaryLabel}>Engagement</Text>
              </View>
            </View>

            {/* Participants */}
            <View style={styles.card}>
              <SectionTitle icon="people" title="Participants" />
              <View style={styles.statGrid}>
                <StatCard icon="people" label="Total" value={stats.participants.total} color="#1271FF" />
                <StatCard icon="bolt" label="Actifs" value={stats.participants.active} subtitle="Ont swipé ou écrit" color="#22c55e" />
                <StatCard icon="trending-up" label="Engagement" value={`${stats.participants.engagement_rate}%`} color="#8b5cf6" />
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={styles.progressLabel}>Taux d'engagement</Text>
                <ProgressBar value={stats.participants.engagement_rate} color="#8b5cf6" />
              </View>
            </View>

            {/* Whitelist */}
            {hasWhitelist && (
              <View style={styles.card}>
                <SectionTitle icon="verified-user" title="Whitelist" />
                <View style={styles.statGrid}>
                  <StatCard icon="list" label="Total" value={stats.whitelist.total} color="#6b7280" />
                  <StatCard icon="check-circle" label="Inscrits" value={stats.whitelist.registered} color="#22c55e" />
                  <StatCard icon="schedule" label="En attente" value={stats.whitelist.pending} color="#f97316" />
                </View>
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.progressLabel}>Taux de conversion : {stats.whitelist.conversion_rate}%</Text>
                  <ProgressBar value={stats.whitelist.conversion_rate} color="#22c55e" />
                </View>
              </View>
            )}

            {/* Swipes */}
            <View style={styles.card}>
              <SectionTitle icon="favorite" title="Activité de swipe" />
              <View style={styles.statGrid}>
                <StatCard icon="swap-horiz" label="Total swipes" value={stats.swipes.total} color="#6b7280" />
                <StatCard icon="thumb-up" label="Likes" value={stats.swipes.likes} color="#22c55e" />
                <StatCard icon="thumb-down" label="Passes" value={stats.swipes.passes} color="#f87171" />
                <StatCard icon="percent" label="Taux like" value={`${stats.swipes.like_rate}%`} color="#ec4899" />
              </View>
              {stats.swipes.total > 0 && (
                <LikesBar
                  likes={stats.swipes.likes}
                  passes={stats.swipes.passes}
                  likeRate={stats.swipes.like_rate}
                />
              )}
              <Text style={styles.swipeNote}>
                {stats.swipes.users_who_swiped} utilisateur{stats.swipes.users_who_swiped > 1 ? 's ont' : ' a'} swipé
              </Text>
            </View>

            {/* Matchs */}
            <View style={styles.card}>
              <SectionTitle icon="favorite-border" title="Matchs" />
              <View style={styles.statGrid}>
                <StatCard icon="favorite" label="Total matchs" value={stats.matching.total_matches} color="#ec4899" />
                <StatCard icon="people" label="Moy. par user" value={stats.matching.average_matches_per_user} subtitle="En moyenne" color="#8b5cf6" />
                <StatCard icon="loop" label="Réciprocité" value={`${stats.matching.reciprocity_rate}%`} subtitle="Likes mutuels" color="#ec4899" />
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={styles.progressLabel}>Taux de réciprocité : {stats.matching.reciprocity_rate}%</Text>
                <ProgressBar value={stats.matching.reciprocity_rate} color="#ec4899" />
              </View>
            </View>

            {/* Messages */}
            <View style={styles.card}>
              <SectionTitle icon="chat" title="Messages" />
              <View style={styles.statGrid}>
                <StatCard icon="chat-bubble" label="Total" value={stats.messages.total} color="#1271FF" />
                <StatCard icon="send" label="Utilisateurs actifs" value={stats.messages.users_who_sent} subtitle="Ont envoyé ≥1 msg" color="#22c55e" />
                <StatCard icon="forum" label="Conv. actives" value={stats.messages.conversations_active} subtitle="Avec ≥1 message" color="#8b5cf6" />
                <StatCard icon="bar-chart" label="Moy./match" value={stats.messages.average_per_conversation} subtitle="En moyenne" color="#f97316" />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerButton: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  summaryBanner: {
    flexDirection: 'row', backgroundColor: '#1271FF', borderRadius: 16,
    padding: 16, marginBottom: 12, alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 20, color: '#fff' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: '#303030' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#F5F5F5', borderRadius: 12,
    padding: 12, alignItems: 'flex-start',
  },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 22, color: '#303030' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statSubtitle: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  progressLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  progressBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  likesBarContainer: { marginTop: 12 },
  likesBarRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  likesBarSegment: { height: '100%' },
  likesLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#6b7280' },
  swipeNote: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
});