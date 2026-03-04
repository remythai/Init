// app/(main)/events/[id]/reports/index.tsx
import { reportService, Report, ReportStats, ReportDetails, ReportStatus, ReportType } from '@/services/report.service';
import { eventService } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  pending:   { label: 'À traiter',  color: '#f97316', bg: '#fff7ed' },
  reviewed:  { label: 'En cours',   color: '#1271FF', bg: '#dbeafe' },
  resolved:  { label: 'Bloqué',     color: '#dc2626', bg: '#fee2e2' },
  dismissed: { label: 'Ignoré',     color: '#6b7280', bg: '#f3f4f6' },
};

const FILTER_TABS: Array<{ key: ReportStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'Tous' },
  { key: 'pending',   label: 'À traiter' },
  { key: 'reviewed',  label: 'En cours' },
  { key: 'resolved',  label: 'Bloqués' },
  { key: 'dismissed', label: 'Ignorés' },
];

function Avatar({ name, size = 32, bg = '#303030' }: { name: string; size?: number; bg?: string }) {
  const initials = name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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
              await eventService.blockUser(id, selected.reported_user.id, 'Suite à signalement');
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
        android_ripple={{ color: '#f3f4f6' }}
      >
        {isPending && <View style={styles.pendingDot} />}

        {/* Top row: type icon + info + status */}
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

        {/* Signaleur → Signalé */}
        <View style={styles.usersRow}>
          <View style={styles.userPill}>
            <Avatar name={`${item.reporter.firstname} ${item.reporter.lastname}`} size={24} bg="#6b7280" />
            <Text style={styles.userPillText} numberOfLines={1}>
              {item.reporter.firstname} {item.reporter.lastname}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={14} color="#9ca3af" />
          <View style={[styles.userPill, { backgroundColor: '#fee2e2' }]}>
            <Avatar name={`${item.reported_user.firstname} ${item.reported_user.lastname}`} size={24} bg="#dc2626" />
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1271FF" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#303030" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Signalements</Text>
          {stats && stats.pending > 0 && (
            <Text style={styles.headerSub}>{stats.pending} en attente</Text>
          )}
        </View>
        <Pressable onPress={() => load(true)} style={styles.headerBtn}>
          <MaterialIcons name="refresh" size={22} color="#303030" />
        </Pressable>
      </View>

      {/* Stats banner */}
      {stats && (
        <View style={styles.statsBanner}>
          {[
            { label: 'À traiter', value: stats.pending,   color: '#f97316' },
            { label: 'En cours',  value: stats.reviewed,  color: '#1271FF' },
            { label: 'Bloqués',   value: stats.resolved,  color: '#dc2626' },
            { label: 'Ignorés',   value: stats.dismissed, color: '#9ca3af' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, type de signalement..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
      >
        {FILTER_TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderReport}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1271FF" />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="flag" size={44} color="#d1d5db" />
            <Text style={styles.emptyText}>{search || filter !== 'all' ? 'Aucun résultat' : 'Aucun signalement'}</Text>
          </View>
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
                <ActivityIndicator size="large" color="#1271FF" />
              </View>
            ) : selected ? (
              <>
                {/* Modal header */}
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
                    <MaterialIcons name="close" size={22} color="#303030" />
                  </Pressable>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                  {/* Users */}
                  <View style={styles.usersBox}>
                    <View style={styles.usersBoxRow}>
                      <Text style={styles.usersBoxRole}>Signaleur</Text>
                      <View style={styles.usersBoxPill}>
                        <Avatar name={`${selected.reporter.firstname} ${selected.reporter.lastname}`} size={30} bg="#6b7280" />
                        <Text style={styles.usersBoxName}>{selected.reporter.firstname} {selected.reporter.lastname}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-downward" size={16} color="#9ca3af" style={{ alignSelf: 'center', marginVertical: 2 }} />
                    <View style={styles.usersBoxRow}>
                      <Text style={[styles.usersBoxRole, { color: '#dc2626' }]}>Signalé</Text>
                      <View style={[styles.usersBoxPill, { backgroundColor: '#fee2e2' }]}>
                        <Avatar name={`${selected.reported_user.firstname} ${selected.reported_user.lastname}`} size={30} bg="#dc2626" />
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

                  {/* Description */}
                  {selected.description && (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxTitle}>Description</Text>
                      <Text style={styles.descBoxText}>{selected.description}</Text>
                    </View>
                  )}

                  {/* Messages (si report message) */}
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

                  {/* Photos (si report photo) */}
                  {selected.photos && selected.photos.length > 0 && (
                    <View style={styles.descBox}>
                      <Text style={styles.descBoxTitle}>Photos signalées</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
                        {selected.photos.map(photo => (
                          <View key={photo.id} style={[styles.photoThumb, photo.is_primary && styles.photoThumbPrimary]}>
                            {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                            <View style={{ width: 100, height: 100, backgroundColor: '#e5e7eb', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialIcons name="image" size={32} color="#9ca3af" />
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Notes orga */}
                  <View>
                    <Text style={styles.descBoxTitle}>Notes organisateur</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={orgaNotes}
                      onChangeText={setOrgaNotes}
                      placeholder="Ajoutez des notes sur ce signalement..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </ScrollView>

                {/* Actions */}
                <View style={styles.modalActions}>
                  {selected.status === 'pending' || selected.status === 'reviewed' ? (
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={styles.dismissBtn}
                        onPress={() => updateStatus('dismissed')}
                        disabled={updating}
                      >
                        {updating ? <ActivityIndicator size="small" color="#6b7280" /> : <Text style={styles.dismissBtnText}>Ignorer</Text>}
                      </Pressable>
                      <Pressable
                        style={styles.reviewBtn}
                        onPress={() => updateStatus('reviewed')}
                        disabled={updating || selected.status === 'reviewed'}
                      >
                        <Text style={[styles.reviewBtnText, selected.status === 'reviewed' && { opacity: 0.4 }]}>En cours</Text>
                      </Pressable>
                      <Pressable
                        style={styles.blockBtn}
                        onPress={handleBlock}
                        disabled={updating}
                      >
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
                      <Pressable
                        style={styles.reopenBtn}
                        onPress={() => updateStatus('pending')}
                        disabled={updating}
                      >
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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  headerSub: { fontSize: 12, color: '#f97316', fontWeight: '600' },
  statsBanner: { flexDirection: 'row', backgroundColor: '#303030', paddingVertical: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 20 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#303030' },
  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 52 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  filterTabActive: { backgroundColor: '#303030' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  // Cards
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  cardPending: { borderLeftWidth: 3, borderLeftColor: '#f97316' },
  pendingDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTypeLabel: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#303030' },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  usersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F5F5', borderRadius: 20, paddingRight: 10, flex: 1, paddingVertical: 3 },
  userPillText: { fontSize: 12, fontWeight: '600', color: '#303030', flex: 1 },
  cardDesc: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 6 },
  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', flex: 0.9 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  modalSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  usersBox: { backgroundColor: '#F5F5F5', borderRadius: 14, padding: 14, gap: 4 },
  usersBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usersBoxRole: { fontSize: 11, color: '#9ca3af', fontWeight: '700', width: 58 },
  usersBoxPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 20, paddingRight: 12, paddingVertical: 4, flex: 1 },
  usersBoxName: { fontSize: 14, fontWeight: '600', color: '#303030' },
  totalReports: { fontSize: 10, color: '#dc2626', marginTop: 1 },
  descBox: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12 },
  descBoxTitle: { fontSize: 11, color: '#9ca3af', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descBoxText: { fontSize: 14, color: '#303030', lineHeight: 20 },
  msgMeta: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  msgBubble: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '85%', borderWidth: 1, borderColor: '#e5e7eb' },
  msgBubbleReported: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  msgText: { fontSize: 13, color: '#303030' },
  photoThumb: { borderRadius: 8, overflow: 'hidden' },
  photoThumbPrimary: { borderWidth: 2, borderColor: '#dc2626' },
  notesInput: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#303030', minHeight: 80,
    textAlignVertical: 'top', marginTop: 6, backgroundColor: '#fff',
  },
  modalActions: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fafafa' },
  actionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dismissBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  dismissBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#6b7280' },
  reviewBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center' },
  reviewBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#1271FF' },
  blockBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderRadius: 12, backgroundColor: '#dc2626' },
  blockBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#fff' },
  reopenBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#1271FF', alignItems: 'center' },
  reopenBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#1271FF' },
});