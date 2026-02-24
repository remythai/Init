// app/(main)/events/[id]/whitelist/index.tsx
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

type WhitelistStatus = 'pending' | 'registered' | 'removed';

interface WhitelistEntry {
  id: number;
  phone_number: string;
  status: WhitelistStatus;
  created_at: string;
  firstname?: string;
  lastname?: string;
}

const STATUS_CONFIG: Record<WhitelistStatus, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  pending:    { label: 'En attente', color: '#f97316', bg: '#fff7ed', icon: 'schedule' },
  registered: { label: 'Inscrit',    color: '#22c55e', bg: '#f0fdf4', icon: 'check-circle' },
  removed:    { label: 'Retiré',     color: '#6b7280', bg: '#f3f4f6', icon: 'remove-circle' },
};

const FILTER_TABS: Array<{ key: WhitelistStatus | 'all'; label: string }> = [
  { key: 'all',        label: 'Tous' },
  { key: 'pending',    label: 'En attente' },
  { key: 'registered', label: 'Inscrits' },
  { key: 'removed',    label: 'Retirés' },
];

export default function WhitelistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<WhitelistStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumbers, setNewNumbers] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, registered: 0, removed: 0 });

  useEffect(() => { load(); }, [id]);

  const authedFetch = async (url: string, opts?: RequestInit) => {
    const token = await authService.getToken();
    return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
  };

  const load = async () => {
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist`);
      if (!resp.ok) throw new Error('Erreur chargement whitelist');
      const data = await resp.json();
      const list: WhitelistEntry[] = data.data?.whitelist || [];
      setEntries(list);
      setStats({
        total: list.length,
        pending: list.filter(e => e.status === 'pending').length,
        registered: list.filter(e => e.status === 'registered').length,
        removed: list.filter(e => e.status === 'removed').length,
      });
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAdd = async () => {
    const lines = newNumbers.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      Alert.alert('Erreur', 'Entrez au moins un numéro');
      return;
    }
    setAddLoading(true);
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist`, {
        method: 'POST',
        body: JSON.stringify({ phone_numbers: lines }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur lors de l\'ajout');
      }
      setNewNumbers('');
      setShowAddModal(false);
      await load();
      Alert.alert('Succès', `${lines.length} numéro(s) ajouté(s)`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = (entry: WhitelistEntry) => {
    Alert.alert(
      'Retirer de la whitelist',
      `Retirer ${entry.phone_number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(entry.id);
            try {
              const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist/${entry.id}`, { method: 'DELETE' });
              if (!resp.ok) throw new Error('Erreur suppression');
              await load();
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filtered = entries.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter;
    const matchSearch = !search.trim() ||
      e.phone_number.includes(search) ||
      `${e.firstname ?? ''} ${e.lastname ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const renderItem = ({ item }: { item: WhitelistEntry }) => {
    const cfg = STATUS_CONFIG[item.status];
    const isLoading = actionLoading === item.id;
    return (
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowPhone}>{item.phone_number}</Text>
          {(item.firstname || item.lastname) && (
            <Text style={styles.rowName}>{item.firstname} {item.lastname}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <MaterialIcons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {item.status !== 'removed' && (
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemove(item)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <MaterialIcons name="close" size={18} color="#dc2626" />
            )}
          </Pressable>
        )}
      </View>
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
        <Text style={styles.headerTitle}>Whitelist</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Stats banner */}
      <View style={styles.statsBanner}>
        {[
          { label: 'Total', value: stats.total, color: '#303030' },
          { label: 'En attente', value: stats.pending, color: '#f97316' },
          { label: 'Inscrits', value: stats.registered, color: '#22c55e' },
          { label: 'Retirés', value: stats.removed, color: '#9ca3af' },
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
          placeholder="Numéro ou nom..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1271FF" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>{search || filter !== 'all' ? 'Aucun résultat' : 'Whitelist vide'}</Text>}
      />

      {/* Add modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter des numéros</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={22} color="#303030" />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>Un numéro par ligne, format international (+33…) ou local</Text>
            <TextInput
              style={styles.numbersInput}
              value={newNumbers}
              onChangeText={setNewNumbers}
              placeholder={'+33612345678\n+33698765432\n0612345678'}
              placeholderTextColor="#9ca3af"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.countHint}>
              {newNumbers.split('\n').filter(l => l.trim()).length} numéro(s)
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)} disabled={addLoading}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleAdd} disabled={addLoading}>
                {addLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Ajouter</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  addBtn: { backgroundColor: '#1271FF', borderRadius: 10, padding: 8 },
  statsBanner: {
    flexDirection: 'row', backgroundColor: '#303030', paddingVertical: 14, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 18 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#303030' },
  filterRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  filterTabActive: { backgroundColor: '#303030' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1 },
  rowPhone: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: '#303030' },
  rowName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  modalSub: { fontSize: 13, color: '#6b7280', marginBottom: 14 },
  numbersInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#303030', minHeight: 140,
    textAlignVertical: 'top', fontFamily: 'monospace',
  },
  countHint: { fontSize: 12, color: '#9ca3af', marginTop: 6, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#303030' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#303030', alignItems: 'center' },
  confirmBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#fff' },
});