// app/(main)/events/[id]/reports/index.tsx
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { type Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { eventService } from '@/services/event.service';
import { Report, ReportDetails, ReportStats, ReportStatus, ReportType, reportService } from '@/services/report.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const TYPE_CONFIG: Record<ReportType, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string; label: string }> = {
  photo:   { icon: 'image',         color: '#7c3aed', bg: '#ede9fe', label: 'Photo' },
  profile: { icon: 'person',        color: '#1271FF', bg: '#dbeafe', label: 'Profil' },
  message: { icon: 'chat-bubble',   color: '#059669', bg: '#d1fae5', label: 'Message' },
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'A traiter',  color: '#f97316', bg: '#fff7ed' },
  reviewed:  { label: 'En cours',   color: '#1271FF', bg: '#dbeafe' },
  resolved:  { label: 'Bloqué',     color: '#dc2626', bg: '#fee2e2' },
  dismissed: { label: 'Ignoré',     color: '#6b7280', bg: '#f3f4f6' },
};

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: 'all',       label: 'Tous' },
  { key: 'pending',   label: 'A traiter' },
  { key: 'reviewed',  label: 'En cours' },
  { key: 'resolved',  label: 'Bloqués' },
  { key: 'dismissed', label: 'Ignorés' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReportDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [orgaNotes, setOrgaNotes] = useState('');

  useEffect(() => { load(); }, [id]);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await reportService.getReports(id);
      setStats(data.stats);
      setReports(data.reports);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger les signalements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openDetails = async (reportId: number) => {
    setLoadingDetails(true);
    setSelected(null);
    try {
      const details = await reportService.getReportDetails(id, reportId);
      setSelected(details);
      setOrgaNotes(details.orga_notes || '');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateStatus = async (status: ReportStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await reportService.updateReport(id, selected.id, { status, orga_notes: orgaNotes || undefined });
      setSelected(null);
      load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleBlock = async () => {
    if (!selected) return;
    const name = `${selected.reported_user.firstname} ${selected.reported_user.lastname}`;
    Alert.alert(
      'Bloquer l\'utilisateur',
      `Bloquer ${name} de cet événement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer', style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await eventService.blockUser(id, selected.reported_user.id, 'Suite a signalement');
              await reportService.updateReport(id, selected.id, { status: 'resolved' });
              setSelected(null);
              load();
              Alert.alert('Succès', `${name} a été bloqué de l'événement`);
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const filtered = reports.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter;
    if (!matchFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${r.reporter.firstname} ${r.reporter.lastname}`.toLowerCase().includes(q) ||
      `${r.reported_user.firstname} ${r.reported_user.lastname}`.toLowerCase().includes(q) ||
      reportService.getReasonLabel(r.reason).toLowerCase().includes(q) ||
      reportService.getTypeLabel(r.report_type).toLowerCase().includes(q)
    );
  });

  const renderReport = ({ item }: { item: Report }) => {
    const type = TYPE_CONFIG[item.report_type];
    const status = STATUS_CONFIG[item.status];
    const isPending = item.status === 'pending';
    return (
      <Pressable
        style={[styles.card, isPending && styles.cardPending]}
        onPress={() => openDetails(item.id)}
        android_ripple={{ color: theme.colors.secondary }}
      >
        {isPending && <View style={styles.pendingDot} />}

        <View style={styles.cardTop}>
          <View style={[styles.typeIcon, { backgroundColor: type.bg }]}>
            <MaterialIcons name={type.icon} size={18} color={type.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTypeLabel}>{type.label} · {reportService.getReasonLabel(item.reason)}</Text>
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.usersRow}>
          <View style={styles.userPill}>
            <Avatar firstname={item.reporter.firstname} lastname={item.reporter.lastname} size={24} bgColor="#6b7280" />
            <Text style={styles.userPillText} numberOfLines={1}>
              {item.reporter.firstname} {item.reporter.lastname}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={14} color={theme.colors.placeholder} />
          <View style={[styles.userPill, { backgroundColor: '#fee2e2' }]}>
            <Avatar firstname={item.reported_user.firstname} lastname={item.reported_user.lastname} size={24} bgColor="#dc2626" />
            <Text style={[styles.userPillText, { color: '#dc2626' }]} numberOfLines={1}>
              {item.reported_user.firstname} {item.reported_user.lastname}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.cardDesc} numberOfLines={1}>"{item.description}"</Text>
        )}
      </Pressable>
    );
  };

  if (loading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title="Signalements"
        subtitle={stats && stats.pending > 0 ? `${stats.pending} en attente` : undefined}
        subtitleColor="#f97316"
        rightAction={
          <Pressable onPress={() => load(true)} style={{ padding: 8, borderRadius: 8 }}>
            <MaterialIcons name="refresh" size={22} color={theme.colors.foreground} />
          </Pressable>
        }
      />

      {stats && (
        <StatsBanner stats={[
          { label: 'A traiter', value: stats.pending,   color: '#f97316' },
          { label: 'En cours',  value: stats.reviewed,  color: '#1271FF' },
          { label: 'Bloqués',   value: stats.resolved,  color: '#dc2626' },
          { label: 'Ignorés',   value: stats.dismissed, color: '#9ca3af' },
        ]} />
      )}

      <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, type de signalement..." />
      <FilterTabs tabs={FILTER_TABS} selected={filter} onSelect={k => setFilter(k as ReportStatus | 'all')} scrollable />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderReport}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={
          <EmptyState icon="flag" title={search || filter !== 'all' ? 'Aucun résultat' : 'Aucun signalement'} />
        }
      />

      {/* Detail modal */}
      <Modal
        visible={!!selected || loadingDetails}
        animationType="slide"
        transparent
        onRequestClose={() => { setSelected(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {loadingDetails ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : selected ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Signalement #{selected.id}</Text>
                    <Text style={styles.modalSubtitle}>
                      {reportService.getTypeLabel(selected.report_type)} · {reportService.getReasonLabel(selected.reason)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selected.status].bg }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selected.status].color }]}>
                      {STATUS_CONFIG[selected.status].label}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} style={{ marginLeft: 8 }}>
                    <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
                  </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                  <View style={styles.usersBox}>
                    <View style={styles.usersBoxRow}>
                      <Text style={styles.usersBoxRole}>Signaleur</Text>
                      <View style={styles.usersBoxPill}>
                        <Avatar firstname={selected.reporter.firstname} lastname={selected.reporter.lastname} size={30} bgColor="#6b7280" />
                        <Text style={styles.usersBoxName}>{selected.reporter.firstname} {selected.reporter.lastname}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-downward" size={16} color={theme.colors.placeholder} style={{ alignSelf: 'center', marginVertical: 2 }} />
                    <View style={styles.usersBoxRow}>
                      <Text style={[styles.usersBoxRole, { color: '#dc2626' }]}>Signalé</Text>
                      <View style={[styles.usersBoxPill, { backgroundColor: '#fee2e2' }]}>
                        <Avatar firstname={selected.reported_user.firstname} lastname={selected.reported_user.lastname} size={30} bgColor="#dc2626" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.usersBoxName, { color: '#dc2626' }]}>
                            {selected.reported_user.firstname} {selected.reported_user.lastname}
                          </Text>
                          {(selected.reported_user.total_reports || 0) > 1 && (
                            <Text style={styles.totalReports}>{selected.reported_user.total_reports} signalements au total</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  {selected.description && (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxTitle}>Description</Text>
                      <Text style={styles.descBoxText}>{selected.description}</Text>
                    </View>
                  )}

                  {selected.messages && selected.messages.length > 0 && (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxTitle}>Conversation ({selected.messages.length} messages)</Text>
                      <View style={{ gap: 8, marginTop: 4 }}>
                        {selected.messages.map(msg => {
                          const isReported = msg.sender_id === selected.reported_user.id;
                          return (
                            <View key={msg.id} style={{ alignItems: isReported ? 'flex-end' : 'flex-start' }}>
                              <Text style={styles.msgMeta}>{msg.sender_name} · {new Date(msg.sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                              <View style={[styles.msgBubble, isReported && styles.msgBubbleReported]}>
                                <Text style={[styles.msgText, isReported && { color: '#991b1b' }]}>{msg.content}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {selected.photos && selected.photos.length > 0 && (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxTitle}>Photos signalées</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
                        {selected.photos.map(photo => (
                          <View key={photo.id} style={[styles.photoThumb, photo.is_primary && styles.photoThumbPrimary]}>
                            <View style={{ width: 100, height: 100, backgroundColor: theme.colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialIcons name="image" size={32} color={theme.colors.placeholder} />
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View>
                    <Text style={styles.descBoxTitle}>Notes organisateur</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={orgaNotes}
                      onChangeText={setOrgaNotes}
                      placeholder="Ajoutez des notes sur ce signalement..."
                      placeholderTextColor={theme.colors.placeholder}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  {selected.status === 'pending' || selected.status === 'reviewed' ? (
                    <View style={styles.actionsRow}>
                      <Pressable style={styles.dismissBtn} onPress={() => updateStatus('dismissed')} disabled={updating}>
                        {updating ? <ActivityIndicator size="small" color={theme.colors.mutedForeground} /> : <Text style={styles.dismissBtnText}>Ignorer</Text>}
                      </Pressable>
                      <Pressable style={styles.reviewBtn} onPress={() => updateStatus('reviewed')} disabled={updating || selected.status === 'reviewed'}>
                        <Text style={[styles.reviewBtnText, selected.status === 'reviewed' && { opacity: 0.4 }]}>En cours</Text>
                      </Pressable>
                      <Pressable style={styles.blockBtn} onPress={handleBlock} disabled={updating}>
                        <MaterialIcons name="block" size={16} color="#fff" />
                        <Text style={styles.blockBtnText}>Bloquer</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selected.status].bg, flex: 1, justifyContent: 'center', paddingVertical: 10 }]}>
                        <Text style={[styles.statusText, { color: STATUS_CONFIG[selected.status].color, textAlign: 'center' }]}>
                          {STATUS_CONFIG[selected.status].label}
                        </Text>
                      </View>
                      <Pressable style={styles.reopenBtn} onPress={() => updateStatus('pending')} disabled={updating}>
                        <Text style={styles.reopenBtnText}>Remettre en attente</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  // Cards
  card: { backgroundColor: theme.colors.card, borderRadius: 14, padding: 14 },
  cardPending: { borderLeftWidth: 3, borderLeftColor: '#f97316' },
  pendingDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTypeLabel: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: theme.colors.foreground },
  cardDate: { fontSize: 11, color: theme.colors.placeholder, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  usersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.background, borderRadius: 20, paddingRight: 10, flex: 1, paddingVertical: 3 },
  userPillText: { fontSize: 12, fontWeight: '600', color: theme.colors.foreground, flex: 1 },
  cardDesc: { fontSize: 12, color: theme.colors.placeholder, fontStyle: 'italic', marginTop: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', flex: 0.9 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
  modalTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: theme.colors.foreground },
  modalSubtitle: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  usersBox: { backgroundColor: theme.colors.background, borderRadius: 14, padding: 14, gap: 4 },
  usersBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usersBoxRole: { fontSize: 11, color: theme.colors.placeholder, fontWeight: '700', width: 58 },
  usersBoxPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card, borderRadius: 20, paddingRight: 12, paddingVertical: 4, flex: 1 },
  usersBoxName: { fontSize: 14, fontWeight: '600', color: theme.colors.foreground },
  totalReports: { fontSize: 10, color: '#dc2626', marginTop: 1 },
  descBox: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 12 },
  descBoxTitle: { fontSize: 11, color: theme.colors.placeholder, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descBoxText: { fontSize: 14, color: theme.colors.foreground, lineHeight: 20 },
  msgMeta: { fontSize: 10, color: theme.colors.placeholder, marginBottom: 2 },
  msgBubble: { backgroundColor: theme.colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '85%', borderWidth: 1, borderColor: theme.colors.border },
  msgBubbleReported: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  msgText: { fontSize: 13, color: theme.colors.foreground },
  photoThumb: { borderRadius: 8, overflow: 'hidden' },
  photoThumbPrimary: { borderWidth: 2, borderColor: '#dc2626' },
  notesInput: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12,
    padding: 12, fontSize: 14, color: theme.colors.foreground, minHeight: 80,
    textAlignVertical: 'top', marginTop: 6, backgroundColor: theme.colors.card,
  },
  modalActions: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.secondary, backgroundColor: theme.colors.card },
  actionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dismissBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: theme.colors.secondary, alignItems: 'center' },
  dismissBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: theme.colors.mutedForeground },
  reviewBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center' },
  reviewBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#1271FF' },
  blockBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: 12, backgroundColor: '#dc2626' },
  blockBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#fff' },
  reopenBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.primary, alignItems: 'center' },
  reopenBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: theme.colors.primary },
});