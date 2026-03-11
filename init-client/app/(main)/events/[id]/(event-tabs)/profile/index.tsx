"use client";
// app/(main)/events/[id]/(event-tabs)/profile/index.tsx

import PhotoManager from '@/components/PhotoManager';
import { useTheme } from '@/context/ThemeContext';
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
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const { id: eventId } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

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
  const [profileError, setProfileError] = useState<string | null>(null);

  const [notUser, setNotUser] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();
      if (!validatedType) { router.push('/auth'); return; }
      if (validatedType !== 'user') { setNotUser(true); return; }

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
      setProfileError(null);
      const data = await eventService.getMyEventProfile(eventId);
      setCustomFields(data.custom_fields || []);
      setProfilInfo(data.profil_info || {});
      setEditedProfilInfo(data.profil_info || {});
    } catch (e: any) {
      console.warn('getMyEventProfile failed, using fallback:', e?.message);
      try {
        // Fallback: get data from list routes that work
        const [publicData, registeredData] = await Promise.all([
          eventService.getPublicEvents({ limit: 50 }),
          eventService.getMyRegisteredEvents(),
        ]);
        // Get custom_fields from public events list
        const publicEvent = publicData.events.find((ev: any) => String(ev.id) === eventId);
        // Get profil_info from registered events
        const reg = registeredData.events.find((ev: any) => String(ev.id) === eventId);
        setCustomFields((publicEvent as any)?.custom_fields || []);
        const info = (reg as any)?.profil_info || {};
        setProfilInfo(info);
        setEditedProfilInfo(info);
      } catch (fallbackErr: any) {
        console.error('Fallback also failed:', fallbackErr);
        setProfileError(fallbackErr?.message || 'Erreur de chargement');
      }
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
      const matches = await matchService.getEventMatches(parseInt(eventId));
      setMatchCount(matches?.length || 0);
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

  const styles = useMemo(() => createStyles(theme), [theme]);

  const initials = profile
    ? `${profile.firstname[0]}${profile.lastname?.[0] || ''}`.toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (notUser) {
    return <View style={styles.centered} />;
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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

        {/* ── Profile header (horizontal like web) ── */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            {primaryPhoto ? (
              <Image
                source={{ uri: photoService.getPhotoUrl(primaryPhoto.file_path) }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile.firstname}</Text>
            <Text style={styles.age}>{profile.age > 0 ? `${profile.age} ans` : ''}</Text>
          </View>
          {!editing && !isBlocked && (
            <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
              <MaterialIcons name="edit" size={20} color={theme.colors.foreground} />
            </Pressable>
          )}
        </View>

        {/* ── Photos (no card wrapper) ── */}
        <View>
          {isBlocked ? (
            <Text style={styles.disabledText}>Modification des photos désactivée</Text>
          ) : (
            <PhotoManager
              eventId={eventId}
              onPhotosChange={handlePhotosChange}
              aspectRatio={9 / 16}
            />
          )}
        </View>

        {/* ── Custom fields ── */}
        <View>
          {editing && (
            <View style={styles.editActions}>
              <Pressable onPress={handleCancel} disabled={saving} style={styles.editActionBtn}>
                <MaterialIcons name="close" size={18} color="#f87171" />
                <Text style={styles.editActionCancelText}>Annuler</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={saving} style={styles.editActionBtn}>
                {saving
                  ? <ActivityIndicator size="small" color="#4ade80" />
                  : <MaterialIcons name="check" size={18} color="#4ade80" />}
                <Text style={styles.editActionSaveText}>{saving ? '...' : 'Sauvegarder'}</Text>
              </Pressable>
            </View>
          )}

          {profileError ? (
            <View style={styles.emptyFields}>
              <MaterialIcons name="error-outline" size={20} color="#f87171" />
              <Text style={[styles.disabledText, { color: '#f87171' }]}>
                {profileError}
              </Text>
              <Pressable style={styles.fillBtn} onPress={loadEventProfile}>
                <MaterialIcons name="refresh" size={16} color={theme.colors.primaryForeground} />
                <Text style={styles.fillBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : customFields.length === 0 ? (
            <View style={styles.sectionBox}>
              <View style={styles.emptyFields}>
                <MaterialIcons name="info-outline" size={20} color={theme.colors.mutedForeground} />
                <Text style={styles.disabledText}>
                  Cet événement n'a pas de champs de profil personnalisés.
                </Text>
              </View>
            </View>
          ) : !editing ? (
            /* View mode */
            <View style={styles.sectionBox}>
              {customFields.every(f => !profilInfo[getFieldId(f.label)]) ? (
                <View style={styles.emptyFields}>
                  <Text style={styles.disabledText}>Aucune information renseignée.</Text>
                  {!isBlocked && (
                    <Pressable style={styles.fillBtn} onPress={() => setEditing(true)}>
                      <MaterialIcons name="edit" size={16} color={theme.colors.primaryForeground} />
                      <Text style={styles.fillBtnText}>Remplir mon profil</Text>
                    </Pressable>
                  )}
                </View>
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
                          placeholderTextColor={theme.colors.mutedForeground}
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
                          placeholderTextColor={theme.colors.mutedForeground}
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
                          Boolean(editedProfilInfo[fieldId]) && styles.checkboxChecked,
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
                                {selected && <MaterialIcons name="check" size={11} color={theme.colors.primary} />}
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

        {/* ── Description (placeholder like web) ── */}
        <View style={styles.sectionBox}>
          <Text style={styles.fieldLabel}>Description</Text>
          <Text style={[styles.disabledText, { fontStyle: 'italic' }]}>
            Cette fonctionnalité sera bientôt disponible
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const createStyles = (theme: ReturnType<typeof import('@/constants/theme').getTheme>) => {
  const colors = theme.colors;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 24 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
    loadingText: { color: colors.mutedForeground, fontSize: 14 },
    errorText: { color: colors.mutedForeground, fontSize: 14 },

    /* Header – horizontal row like web */
    headerSection: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      paddingTop: 8, paddingBottom: 4,
    },
    avatarWrapper: {},
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarImage: {
      width: 80, height: 80, borderRadius: 40,
    },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
    headerInfo: { flex: 1 },
    name: { color: colors.foreground, fontSize: 24, fontWeight: '600' },
    age: { color: `${colors.foreground}B3`, fontSize: 18 },
    editBtn: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: `${colors.mutedForeground}40`,
      alignItems: 'center', justifyContent: 'center',
    },

    /* Blocked */
    blockedBanner: {
      flexDirection: 'row', gap: 12, alignItems: 'flex-start',
      backgroundColor: 'rgba(239,68,68,0.18)',
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
      borderRadius: 16, padding: 14,
    },
    blockedTitle: { color: '#fca5a5', fontWeight: '700', marginBottom: 2 },
    blockedBody: { color: 'rgba(252,165,165,0.8)', fontSize: 13, lineHeight: 18 },

    /* Section box – gray rounded like web */
    sectionBox: {
      backgroundColor: `${colors.mutedForeground}30`,
      borderRadius: 19, paddingHorizontal: 24, paddingVertical: 20,
      gap: 16,
    },

    /* Edit actions row */
    editActions: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    editActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    editActionCancelText: { color: '#f87171', fontSize: 15, fontWeight: '500' },
    editActionSaveText: { color: '#4ade80', fontSize: 15, fontWeight: '500' },

    disabledText: { color: colors.mutedForeground, fontSize: 14 },
    emptyFields: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    fillBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.primary, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8, marginTop: 8,
    },
    fillBtnText: { color: colors.primaryForeground, fontSize: 14, fontWeight: '600' },

    /* Fields – view */
    fieldRow: { gap: 2 },
    fieldLabel: { color: colors.mutedForeground, fontSize: 14 },
    fieldValue: { color: colors.foreground, fontSize: 16, lineHeight: 22 },

    /* Fields – edit */
    fieldsEdit: { gap: 18 },
    inputGroup: { gap: 6 },
    inputLabel: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
    input: {
      backgroundColor: `${colors.mutedForeground}20`,
      borderRadius: 19,
      paddingHorizontal: 20, paddingVertical: 16,
      color: colors.foreground, fontSize: 15,
    },
    textarea: { minHeight: 96, textAlignVertical: 'top' },
    charCount: { color: colors.mutedForeground, fontSize: 12, textAlign: 'right' },

    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: {
      width: 24, height: 24, borderRadius: 6,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxLabel: { color: colors.foreground, fontSize: 15 },

    optionsList: { gap: 8 },
    optionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    },
    optionBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { color: colors.mutedForeground, fontSize: 15, flex: 1 },
    optionTextSelected: { color: colors.primaryForeground },
    multiCheckbox: {
      width: 20, height: 20, borderRadius: 4,
      borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    multiCheckboxSelected: { backgroundColor: colors.card, borderColor: colors.card },
  });
};