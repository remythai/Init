// app/(main)/events/[id]/reports/index.tsx
import { authService } from '@/services/auth.service';
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type ReportStatus = 'pending' | 'reviewed' | 'dismissed';
type ReportReason = 'inappropriate' | 'false_info' | 'spam' | 'harassment' | 'other';

interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  created_at: string;
  reporter_firstname: string;
  reporter_lastname: string;
  reported_firstname: string;
  reported_lastname: string;
}

const REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: 'Contenu inapproprié',
  false_info:    'Fausses informations',
  spam:          'Spam',
  harassment:    'Harcèlement',
  other:         'Autre',
};

const REASON_ICONS: Record<ReportReason, keyof typeof MaterialIcons.glyphMap> = {
  inappropriate: 'warning',
  false_info:    'error',
  spam:          'mark-email-unread',
  harassment:    'report',
  other:         'flag',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente', color: '#f97316', bg: '#fff7ed' },
  reviewed:  { label: 'Traité',     color: '#22c55e', bg: '#f0fdf4' },
  dismissed: { label: 'Ignoré',     color: '#6b7280', bg: '#f3f4f6' },
};

const FILTER_TABS: Array<{ key: ReportStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'Tous' },
  { key: 'pending',   label: 'En attente' },
  { key: 'reviewed',  label: 'Traités' },
  { key: 'dismissed', label: 'Ignorés' },
];

function Avatar({ firstname, lastname, size = 38 }: { firstname?: string; lastname?: string; size?: number }) {
  const initials = `${firstname?.[0] ?? '?'}${lastname?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0, dismissed: 0 });

  useEffect(() => { load(); }, [id]);

  const authedFetch = async (url: string, opts?: RequestInit) => {
    const token = await authService.getToken();
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts?.headers || {}),
      },
    });
  };

  const load = async () => {
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/reports`);
      if (!resp.ok) throw new Error('Erreur chargement signalements');
      const data = await resp.json();
      const list: Report[] = data.data?.reports || [];
      setReports(list);
      setStats({
        pending:   list.filter(r => r.status === 'pending').length,
        reviewed:  list.filter(r => r.status === 'reviewed').length,
        dismissed: list.filter(r => r.status === 'dismissed').length,
      });
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (reportId: number, status: ReportStatus) => {
    setActionLoading(true);
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!resp.ok) throw new Error('Erreur mise à jour');
      await load();
      setSelected(null);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockReported = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/blocked`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: selected.reported_user_id,
          reason: blockReason || 'Signalement accepté',
        }),
      });
      if (!resp.ok) throw new Error('Erreur blocage');
      await updateStatus(selected.id, 'reviewed');
      setShowBlockInput(false);
      setBlockReason('');
      Alert.alert('Succès', `${selected.reported_firstname} a été bloqué de l'événement`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = reports.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${r.reporter_firstname} ${r.reporter_lastname}`.toLowerCase().includes(q) ||
      `${r.reported_firstname} ${r.reported_lastname}`.toLowerCase().includes(q) ||
      REASON_LABELS[r.reason].toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const renderReport = ({ item }: { item: Report }) => {
    const cfg = STATUS_CONFIG[item.status];
    const isPending = item.status === 'pending';
    return (
      <Pressable style={[styles.reportCard, isPending && styles.reportCardPending]} onPress={() => { setSelected(item); setShowBlockInput(false); }}>
        {isPending && <View style={styles.pendingIndicator} />}
        <View style={styles.reportTop}>
          <View style={[styles.reasonIcon, { backgroundColor: '#fee2e2' }]}>
            <MaterialIcons name={REASON_ICONS[item.reason]} size={18} color="#dc2626" />
          </View>
          <View style={styles.reportTopInfo}>
            <Text style={styles.reasonLabel}>{REASON_LABELS[item.reason]}</Text>
            <Text style={styles.reportDate}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.usersRow}>
          <View style={styles.userPill}>
            <Avatar firstname={item.reporter_firstname} lastname={item.reporter_lastname} size={26} />
            <Text style={styles.userPillText} numberOfLines={1}>
              {item.reporter_firstname} {item.reporter_lastname}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={16} color="#9ca3af" />
          <View style={[styles.userPill, { backgroundColor: '#fee2e2' }]}>
            <Avatar firstname={item.reported_firstname} lastname={item.reported_lastname} size={26} />
            <Text style={[styles.userPillText, { color: '#dc2626' }]} numberOfLines={1}>
              {item.reported_firstname} {item.reported_lastname}
            </Text>
          </View>
        </View>

        {item.details && (
          <Text style={styles.reportDetails} numberOfLines={2}>"{item.details}"</Text>
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
          {stats.pending > 0 && (
            <Text style={styles.headerSub}>{stats.pending} en attente</Text>
          )}
        </View>
        <Pressable onPress={() => { setRefreshing(true); load(); }} style={styles.headerBtn}>
          <MaterialIcons name="refresh" size={22} color="#303030" />
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsBanner}>
        {[
          { label: 'En attente', value: stats.pending,   color: '#f97316' },
          { label: 'Traités',    value: stats.reviewed,  color: '#22c55e' },
          { label: 'Ignorés',    value: stats.dismissed, color: '#9ca3af' },
        ].map((s, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom d'utilisateur, motif..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1271FF" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>{search || filter !== 'all' ? 'Aucun résultat' : 'Aucun signalement'}</Text>}
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => { setSelected(null); setShowBlockInput(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Signalement #{selected.id}</Text>
                  <Pressable onPress={() => { setSelected(null); setShowBlockInput(false); }}>
                    <MaterialIcons name="close" size={22} color="#303030" />
                  </Pressable>
                </View>

                {/* Reason */}
                <View style={styles.modalReasonRow}>
                  <MaterialIcons name={REASON_ICONS[selected.reason]} size={20} color="#dc2626" />
                  <Text style={styles.modalReasonText}>{REASON_LABELS[selected.reason]}</Text>
                </View>

                {/* Users */}
                <View style={styles.modalUsersBox}>
                  <View style={styles.modalUserRow}>
                    <Text style={styles.modalUserRole}>Signaleur</Text>
                    <View style={styles.modalUserPill}>
                      <Avatar firstname={selected.reporter_firstname} lastname={selected.reporter_lastname} size={30} />
                      <Text style={styles.modalUserName}>{selected.reporter_firstname} {selected.reporter_lastname}</Text>
                    </View>
                  </View>
                  <MaterialIcons name="arrow-downward" size={16} color="#9ca3af" style={{ alignSelf: 'center', marginVertical: 4 }} />
                  <View style={styles.modalUserRow}>
                    <Text style={styles.modalUserRole}>Signalé</Text>
                    <View style={[styles.modalUserPill, { backgroundColor: '#fee2e2' }]}>
                      <Avatar firstname={selected.reported_firstname} lastname={selected.reported_lastname} size={30} />
                      <Text style={[styles.modalUserName, { color: '#dc2626' }]}>{selected.reported_firstname} {selected.reported_lastname}</Text>
                    </View>
                  </View>
                </View>

                {selected.details && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsTitle}>Détails</Text>
                    <Text style={styles.detailsText}>"{selected.details}"</Text>
                  </View>
                )}

                {/* Status */}
                <View style={[styles.currentStatus, { backgroundColor: STATUS_CONFIG[selected.status].bg }]}>
                  <Text style={[styles.currentStatusText, { color: STATUS_CONFIG[selected.status].color }]}>
                    Statut actuel : {STATUS_CONFIG[selected.status].label}
                  </Text>
                </View>

                {/* Block input */}
                {showBlockInput && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.fieldLabel}>Raison du blocage (optionnel)</Text>
                    <TextInput
                      style={styles.blockInput}
                      value={blockReason}
                      onChangeText={setBlockReason}
                      placeholder="Comportement inapproprié..."
                      placeholderTextColor="#9ca3af"
                      multiline
                    />
                  </View>
                )}

                {/* Actions */}
                {selected.status === 'pending' ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.dismissBtn}
                      onPress={() => updateStatus(selected.id, 'dismissed')}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator size="small" color="#6b7280" /> : (
                        <Text style={styles.dismissBtnText}>Ignorer</Text>
                      )}
                    </Pressable>
                    {showBlockInput ? (
                      <Pressable
                        style={styles.blockConfirmBtn}
                        onPress={handleBlockReported}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                          <Text style={styles.blockConfirmBtnText}>Confirmer le blocage</Text>
                        )}
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.blockBtn}
                        onPress={() => setShowBlockInput(true)}
                        disabled={actionLoading}
                      >
                        <MaterialIcons name="block" size={16} color="#fff" />
                        <Text style={styles.blockBtnText}>Bloquer</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <Pressable
                    style={styles.reopenBtn}
                    onPress={() => updateStatus(selected.id, 'pending')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator size="small" color="#1271FF" /> : (
                      <Text style={styles.reopenBtnText}>Remettre en attente</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  headerSub: { fontSize: 12, color: '#f97316', fontWeight: '600' },
  statsBanner: { flexDirection: 'row', backgroundColor: '#303030', paddingVertical: 14, paddingHorizontal: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 20 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#303030' },
  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', maxHeight: 52 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  filterTabActive: { backgroundColor: '#303030' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  reportCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, overflow: 'hidden',
  },
  reportCardPending: { borderLeftWidth: 3, borderLeftColor: '#f97316' },
  pendingIndicator: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, backgroundColor: '#f97316', borderRadius: 4, margin: 10 },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reasonIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reportTopInfo: { flex: 1 },
  reasonLabel: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#303030' },
  reportDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  usersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  userPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: 20, paddingRight: 10, flex: 1 },
  userPillText: { fontSize: 12, fontWeight: '600', color: '#303030', flex: 1 },
  reportDetails: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  avatar: { backgroundColor: '#303030', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  modalReasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalReasonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: '#dc2626' },
  modalUsersBox: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, marginBottom: 12 },
  modalUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalUserRole: { fontSize: 11, color: '#9ca3af', width: 60, fontWeight: '600' },
  modalUserPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 20, paddingRight: 12, flex: 1 },
  modalUserName: { fontSize: 14, fontWeight: '600', color: '#303030' },
  detailsBox: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 12 },
  detailsTitle: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 4 },
  detailsText: { fontSize: 13, color: '#303030', fontStyle: 'italic' },
  currentStatus: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12, alignSelf: 'flex-start' },
  currentStatusText: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#303030', marginBottom: 6 },
  blockInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#303030', minHeight: 70, textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dismissBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  dismissBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#6b7280' },
  blockBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626' },
  blockBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#fff' },
  blockConfirmBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center' },
  blockConfirmBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#fff' },
  reopenBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#1271FF', alignItems: 'center' },
  reopenBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#1271FF' },
});