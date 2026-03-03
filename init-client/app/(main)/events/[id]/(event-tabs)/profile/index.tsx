"use client";
// app/(main)/events/[id]/(event-tabs)/profile/index.tsx

import PhotoManager from '@/components/PhotoManager';
import { User, authService } from '@/services/auth.service';
import {
  CustomField,
  eventService,
  getFieldId,
  getFieldPlaceholder,
} from '@/services/event.service';
import { matchService } from '@/services/match.service';
import { Photo, photoService } from '@/services/photo.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function EventMyProfileScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const [profile, setProfile] = useState<{
    firstname: string;
    lastname: string;
    age: number;
  } | null>(null);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [profilInfo, setProfilInfo] = useState<Record<string, unknown>>({});
  const [editedProfilInfo, setEditedProfilInfo] = useState<Record<string, unknown>>({});
  const [primaryPhoto, setPrimaryPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();
      if (!validatedType) { router.push('/auth'); return; }
      if (validatedType !== 'user') { router.push('/events'); return; }

      loadProfile();
      loadMatchStats();
      loadEventProfile();
      loadEventPhotos();
      checkBlockedStatus();
    };
    initPage();
  }, [eventId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userData = await authService.getCurrentProfile() as User;
      if (userData) {
        let age = 25;
        if (userData.birthday) {
          const birth = new Date(userData.birthday);
          const today = new Date();
          age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }
        setProfile({
          firstname: userData.firstname || 'Utilisateur',
          lastname: userData.lastname || '',
          age,
        });
      }
    } catch {
      setProfile({ firstname: 'Utilisateur', lastname: '', age: 25 });
    } finally {
      setLoading(false);
    }
  };

  const loadEventProfile = async () => {
    try {
      const data = await eventService.getMyEventProfile(eventId);
      setCustomFields(data.custom_fields || []);
      setProfilInfo(data.profil_info || {});
      setEditedProfilInfo(data.profil_info || {});
    } catch (e) {
      console.error('Error loading event profile:', e);
    }
  };

  const loadEventPhotos = async () => {
    try {
      const photos = await photoService.getPhotos(eventId);
      setPrimaryPhoto(photoService.getPrimaryPhoto(photos));
    } catch (e) {
      console.error('Error loading event photos:', e);
    }
  };

  const handlePhotosChange = (photos: Photo[]) => {
    setPrimaryPhoto(photoService.getPrimaryPhoto(photos));
  };

  const loadMatchStats = async () => {
    try {
      const data = await matchService.getAllMatches();
      const eventMatches = data.by_event?.find(
        (e: any) => String(e.event.id) === eventId
      );
      setMatchCount(eventMatches?.matches?.length || 0);
    } catch {
      setMatchCount(0);
    }
  };

  const checkBlockedStatus = async () => {
    try {
      const data = await eventService.getMyRegisteredEvents();
      const event = data.events.find((e) => String(e.id) === eventId);
      setIsBlocked(event?.is_blocked || false);
    } catch (e) {
      console.error('Error checking blocked status:', e);
      setIsBlocked(false); // fail silently, pas critique
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await eventService.updateMyEventProfile(eventId, editedProfilInfo);
      setProfilInfo(editedProfilInfo);
      setEditing(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler les modifications',
      'Voulez-vous vraiment annuler ? Vos modifications seront perdues.',
      [
        { text: 'Continuer à modifier', style: 'cancel' },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: () => {
            setEditedProfilInfo(profilInfo);
            setEditing(false);
          },
        },
      ]
    );
  };

  const getFieldDisplayValue = (field: CustomField, value: unknown): string => {
    if ((field.type === 'select' || field.type === 'radio') && value)
      return String(value);
    if (field.type === 'multiselect' && Array.isArray(value))
      return value.join(', ');
    if (field.type === 'checkbox') return value ? 'Oui' : 'Non';
    return String(value || '');
  };

  const initials = profile
    ? `${profile.firstname[0]}${profile.lastname?.[0] || ''}`.toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1271FF" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Erreur lors du chargement du profil</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Profile header ── */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            {/* Avatar initials (primary photo overlay handled by PhotoManager) */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>
            {profile.firstname} {profile.lastname}, {profile.age}
          </Text>
        </View>

        {/* ── Blocked warning ── */}
        {isBlocked && (
          <View style={styles.blockedBanner}>
            <MaterialIcons name="warning" size={22} color="#f87171" />
            <View style={{ flex: 1 }}>
              <Text style={styles.blockedTitle}>Profil bloqué</Text>
              <Text style={styles.blockedBody}>
                Vous avez été retiré de cet événement. Vous ne pouvez plus modifier votre profil ni vos photos.
              </Text>
            </View>
          </View>
        )}

        {/* ── Photos ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes photos</Text>
          {isBlocked ? (
            <Text style={styles.disabledText}>Modification des photos désactivée</Text>
          ) : (
            <PhotoManager
              eventId={eventId}
              onPhotosChange={handlePhotosChange}
            />
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statCard}>
          <Text style={styles.statCount}>{matchCount}</Text>
          <Text style={styles.statLabel}>Matchs sur cet événement</Text>
        </View>

        {/* ── Custom fields ── */}
        {customFields.length > 0 && (
          <View style={styles.card}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Mon profil événement</Text>
              {!editing ? (
                !isBlocked && (
                  <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                    <MaterialIcons name="edit" size={20} color="#1271FF" />
                  </Pressable>
                )
              ) : (
                <View style={styles.editActions}>
                  <Pressable onPress={handleCancel} disabled={saving} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#f87171" />
                  </Pressable>
                  <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
                    {saving
                      ? <ActivityIndicator size="small" color="#4ade80" />
                      : <MaterialIcons name="check" size={22} color="#4ade80" />}
                  </Pressable>
                </View>
              )}
            </View>

            {/* View mode */}
            {!editing ? (
              <View style={styles.fieldsView}>
                {customFields.every(f => !profilInfo[getFieldId(f.label)]) ? (
                  <Text style={styles.disabledText}>Aucune information renseignée</Text>
                ) : (
                  customFields.map((field) => {
                    const fieldId = getFieldId(field.label);
                    const value = profilInfo[fieldId];
                    if (value === undefined || value === null || value === '') return null;
                    return (
                      <View key={fieldId} style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        <Text style={styles.fieldValue}>
                          {getFieldDisplayValue(field, value)}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            ) : (
              /* Edit mode */
              <View style={styles.fieldsEdit}>
                {customFields.map((field) => {
                  const fieldId = getFieldId(field.label);
                  return (
                    <View key={fieldId} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        {field.label}
                        {field.required && <Text style={{ color: '#f87171' }}> *</Text>}
                      </Text>

                      {/* text / email / phone / number */}
                      {(['text', 'email', 'phone', 'number'] as const).includes(field.type as any) && (
                        <>
                          <TextInput
                            style={styles.input}
                            placeholder={getFieldPlaceholder(field)}
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            keyboardType={
                              field.type === 'email' ? 'email-address'
                              : field.type === 'phone' ? 'phone-pad'
                              : field.type === 'number' ? 'numeric'
                              : 'default'
                            }
                            value={
                              editedProfilInfo[fieldId] !== undefined
                                ? String(editedProfilInfo[fieldId])
                                : ''
                            }
                            maxLength={field.type === 'text' ? 150 : undefined}
                            onChangeText={(t) =>
                              setEditedProfilInfo((prev) => ({
                                ...prev,
                                [fieldId]: field.type === 'number'
                                  ? (t === '' ? '' : Number(t))
                                  : t.slice(0, field.type === 'text' ? 150 : 9999),
                              }))
                            }
                          />
                          {field.type === 'text' && (
                            <Text style={[
                              styles.charCount,
                              String(editedProfilInfo[fieldId] || '').length >= 140 && { color: '#fb923c' },
                            ]}>
                              {String(editedProfilInfo[fieldId] || '').length}/150
                            </Text>
                          )}
                        </>
                      )}

                      {/* textarea */}
                      {field.type === 'textarea' && (
                        <>
                          <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder={getFieldPlaceholder(field)}
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={(editedProfilInfo[fieldId] as string) || ''}
                            maxLength={500}
                            onChangeText={(t) =>
                              setEditedProfilInfo((prev) => ({
                                ...prev,
                                [fieldId]: t.slice(0, 500),
                              }))
                            }
                          />
                          <Text style={[
                            styles.charCount,
                            ((editedProfilInfo[fieldId] as string) || '').length >= 450 && { color: '#fb923c' },
                          ]}>
                            {((editedProfilInfo[fieldId] as string) || '').length}/500
                          </Text>
                        </>
                      )}

                      {/* checkbox */}
                      {field.type === 'checkbox' && (
                        <Pressable
                          style={styles.checkboxRow}
                          onPress={() =>
                            setEditedProfilInfo((prev) => ({
                              ...prev,
                              [fieldId]: !prev[fieldId],
                            }))
                          }
                        >
                          <View style={[
                            styles.checkbox,
                            editedProfilInfo[fieldId] && styles.checkboxChecked,
                          ]}>
                            {Boolean(editedProfilInfo[fieldId]) && (
                              <MaterialIcons name="check" size={14} color="#fff" />
                            )}
                          </View>
                          <Text style={styles.checkboxLabel}>Oui</Text>
                        </Pressable>
                      )}

                      {/* radio / select */}
                      {(field.type === 'radio' || field.type === 'select') && (
                        <View style={styles.optionsList}>
                          {field.options?.map((option) => (
                            <Pressable
                              key={option}
                              style={[
                                styles.optionBtn,
                                editedProfilInfo[fieldId] === option && styles.optionBtnSelected,
                              ]}
                              onPress={() =>
                                setEditedProfilInfo((prev) => ({
                                  ...prev,
                                  [fieldId]: option,
                                }))
                              }
                            >
                              <Text style={[
                                styles.optionText,
                                editedProfilInfo[fieldId] === option && styles.optionTextSelected,
                              ]}>
                                {option}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {/* multiselect */}
                      {field.type === 'multiselect' && (
                        <View style={styles.optionsList}>
                          {field.options?.map((option) => {
                            const selected = ((editedProfilInfo[fieldId] as string[]) || []).includes(option);
                            return (
                              <Pressable
                                key={option}
                                style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                                onPress={() => {
                                  setEditedProfilInfo((prev) => {
                                    const current = (prev[fieldId] as string[]) || [];
                                    return {
                                      ...prev,
                                      [fieldId]: selected
                                        ? current.filter((v) => v !== option)
                                        : [...current, option],
                                    };
                                  });
                                }}
                              >
                                <View style={[styles.multiCheckbox, selected && styles.multiCheckboxSelected]}>
                                  {selected && <MaterialIcons name="check" size={11} color="#1271FF" />}
                                </View>
                                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Tips ── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Conseils</Text>
          <Text style={styles.tipItem}>• Ajoutez une photo de profil claire et souriante</Text>
          <Text style={styles.tipItem}>• Décrivez vos centres d'intérêt dans votre bio</Text>
          <Text style={styles.tipItem}>• Soyez authentique et ouvert aux nouvelles rencontres</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const BLUE = '#1271FF';
const CARD_BG = 'rgba(255,255,255,0.10)';
const BORDER = 'rgba(255,255,255,0.18)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b3e' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#0d1b3e' },
  loadingText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  errorText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },

  /* Header */
  headerSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  avatarWrapper: { marginBottom: 12 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },

  /* Blocked */
  blockedBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 16, padding: 14,
  },
  blockedTitle: { color: '#fca5a5', fontWeight: '700', marginBottom: 2 },
  blockedBody: { color: 'rgba(252,165,165,0.8)', fontSize: 13, lineHeight: 18 },

  /* Cards */
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 20, padding: 18,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 14 },

  disabledText: { color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: 14 },

  /* Stat card */
  statCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 20, padding: 18,
    alignItems: 'center',
  },
  statCount: { color: '#fff', fontSize: 40, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },

  /* Fields – view */
  fieldsView: { gap: 12 },
  fieldRow: { gap: 2 },
  fieldLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  fieldValue: { color: '#fff', fontSize: 15, lineHeight: 22 },

  /* Fields – edit */
  fieldsEdit: { gap: 18 },
  inputGroup: { gap: 6 },
  inputLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  charCount: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'right' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BLUE, borderColor: BLUE },
  checkboxLabel: { color: '#fff', fontSize: 15 },

  optionsList: { gap: 8 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  optionBtnSelected: { backgroundColor: BLUE, borderColor: BLUE },
  optionText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, flex: 1 },
  optionTextSelected: { color: '#fff' },
  multiCheckbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  multiCheckboxSelected: { backgroundColor: '#fff', borderColor: '#fff' },

  /* Tips */
  tipsCard: {
    backgroundColor: 'rgba(18,113,255,0.18)',
    borderRadius: 20, padding: 18, gap: 6,
  },
  tipsTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  tipItem: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20 },
});