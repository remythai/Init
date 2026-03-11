// components/ConversationScreen.tsx
// Shared conversation UI used by both global and event messagery
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { matchService, type MatchUserProfile, type Photo } from '@/services/match.service';
import { socketService } from '@/services/socket.service';
import { reportService, ReportType } from '@/services/report.service';
import { useRealTimeMessages } from '@/hooks/useRealTimeMessages';
import { Avatar } from '@/components/ui/Avatar';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SlideUpModal } from '@/components/ui/SlideUpModal';
import * as Haptics from 'expo-haptics';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiMessage {
  id: number;
  sender_id: number;
  content: string;
  sent_at: string;
  is_read: boolean;
  is_liked: boolean;
}

interface Message {
  id: string;
  senderId: 'me' | 'other';
  text: string;
  timestamp: string;
  date: string;
  isLiked?: boolean;
}

interface DateGroup {
  dateLabel: string;
  dateKey: string;
  messages: Message[];
}

function getPhotoUri(filePath?: string): string | null {
  if (!filePath) return null;
  return filePath.startsWith('http') ? filePath : `${API_URL}${filePath}`;
}

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function TypingDots({ color }: { color: string }) {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3, backgroundColor: color,
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
}

// Skeleton loader for conversation
function ConversationSkeleton({ theme }: { theme: Theme }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const Bone = ({ width, height, style }: { width: number | string; height: number; style?: any }) => (
    <Animated.View style={[{ width, height, borderRadius: height / 2, backgroundColor: theme.colors.border, opacity }, style]} />
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
          <View style={{ maxWidth: '70%' }}>
            <Bone width={120 + (i * 30) % 80} height={36} style={{ borderRadius: 18 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

interface ConversationScreenProps {
  matchId: number;
  onBack: () => void;
}

export function ConversationScreen({ matchId, onBack }: ConversationScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top, insets.bottom), [theme, insets.top, insets.bottom]);

  const flatListRef = useRef<FlatList>(null);

  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserName, setOtherUserName] = useState('Match');
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const [otherUserPhoto, setOtherUserPhoto] = useState<string | null>(null);
  const [eventName, setEventName] = useState('Événement');
  const [eventId, setEventId] = useState<number | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [isEventExpired, setIsEventExpired] = useState(false);
  const [isOtherUserBlocked, setIsOtherUserBlocked] = useState(false);

  // Real-time messages
  const handleRealTimeMessage = useCallback((message: { id: number; content: string; sender_id: number; sent_at: string; match_id: number }) => {
    const mapped: Message = {
      id: message.id.toString(),
      senderId: 'other',
      text: message.content,
      timestamp: formatMsgTime(message.sent_at),
      date: toDateKey(message.sent_at),
    };
    setMessages(prev => {
      if (prev.some(m => m.id === mapped.id)) return prev;
      return [...prev, mapped];
    });
    if (matchId) matchService.markConversationMessagesAsRead(matchId).catch(() => {});
  }, [matchId]);

  const { typingUsers, sendTyping } = useRealTimeMessages({
    matchId: matchId || null,
    onNewMessage: handleRealTimeMessage,
  });

  // Like handler
  const handleToggleLike = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isLiked: !m.isLiked } : m
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await matchService.toggleMessageLike(parseInt(messageId));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isLiked: !m.isLiked } : m
      ));
    }
  }, []);

  // Socket listener for likes
  useEffect(() => {
    const unsub = socketService.onMessageLiked((data) => {
      if (data.matchId !== matchId) return;
      setMessages(prev => prev.map(m =>
        m.id === data.messageId.toString() ? { ...m, isLiked: data.isLiked } : m
      ));
    });
    return unsub;
  }, [matchId]);

  // Report modal
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Profile modal
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<MatchUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', scrollToBottom);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!matchId) return;
    loadMessages();
  }, [matchId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await matchService.getMessages(matchId);
      const { match, messages: apiMessages } = res;

      setEventName(match.event_name || 'Événement');
      setEventId(match.event_id || null);
      setOtherUserId(match.user.id);
      setOtherUserName(`${match.user.firstname} ${match.user.lastname}`.trim() || 'Match');

      const photos = match.user.photos;
      if (photos && photos.length > 0) {
        setOtherUserPhoto(getPhotoUri(photos[0].file_path));
      }

      setIsArchived(res.is_blocked || false);
      setIsEventExpired(res.is_event_expired || false);
      setIsOtherUserBlocked(res.is_other_user_blocked || false);

      const mapped: Message[] = apiMessages.map((m: ApiMessage) => ({
        id: m.id.toString(),
        senderId: m.sender_id === match.user.id ? 'other' : 'me',
        text: m.content,
        timestamp: formatMsgTime(m.sent_at),
        date: toDateKey(m.sent_at),
        isLiked: m.is_liked,
      }));
      setMessages(mapped);
      matchService.markConversationMessagesAsRead(matchId).catch(() => {});
    } catch (e) {
      console.error('Erreur chargement messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !matchId || sending || isArchived || isEventExpired || isOtherUserBlocked) return;
    const content = messageText.trim();
    setMessageText('');
    sendTyping(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: content,
      timestamp: formatMsgTime(now),
      date: toDateKey(now),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const sent = await matchService.sendMessage(matchId, content);
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? { ...m, id: sent.id.toString() } : m)
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
  };

  const handleReportSubmit = async () => {
    if (!reportType || !otherUserId || !eventId) return;
    setSubmittingReport(true);
    try {
      await reportService.createReport(String(eventId), {
        reportedUserId: otherUserId,
        matchId: reportType === 'message' ? matchId : undefined,
        reportType,
        reason: reportType === 'message' ? 'harassment' : 'inappropriate',
        description: reportDesc || undefined,
      });
      setShowReport(false);
      setReportType(null);
      setReportDesc('');
      Alert.alert('Signalement envoyé', "L'organisateur va l'examiner.");
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le signalement');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleOpenProfile = async () => {
    if (!matchId || isArchived || isOtherUserBlocked) return;
    setLoadingProfile(true);
    setShowProfile(true);
    setProfilePhotoIndex(0);
    try {
      const profile = await matchService.getMatchProfile(matchId);
      setProfileData(profile);
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      setShowProfile(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatFieldLabel = (fieldId: string): string =>
    fieldId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: DateGroup[] = [];
    messages.forEach(msg => {
      const last = groups[groups.length - 1];
      if (last && last.dateKey === msg.date) {
        last.messages.push(msg);
      } else {
        groups.push({ dateKey: msg.date, dateLabel: formatDateLabel(msg.date + 'T12:00:00'), messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const lastTapRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  const handleDoubleTap = useCallback((msg: Message) => {
    if (msg.senderId === 'me') return;
    const now = Date.now();
    if (lastTapRef.current.id === msg.id && now - lastTapRef.current.time < 300) {
      handleToggleLike(msg.id);
      lastTapRef.current = { id: '', time: 0 };
    } else {
      lastTapRef.current = { id: msg.id, time: now };
    }
  }, [handleToggleLike]);

  const renderDateGroup = ({ item: group }: { item: DateGroup }) => (
    <View>
      <View style={styles.dateSeparator}>
        <Text style={styles.dateSeparatorText}>{group.dateLabel}</Text>
      </View>
      {group.messages.map(msg => (
        <Pressable
          key={msg.id}
          style={[styles.msgRow, msg.senderId === 'me' ? styles.msgRowRight : styles.msgRowLeft, msg.isLiked && { marginBottom: 10 }]}
          onPress={() => handleDoubleTap(msg)}
        >
          <View style={{ maxWidth: '75%' }}>
            <View style={[styles.bubble, msg.senderId === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, msg.senderId === 'me' ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                {msg.text}
              </Text>
              <Text style={[styles.bubbleTime, msg.senderId === 'me' ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                {msg.timestamp}
              </Text>
            </View>
            {msg.isLiked && (
              <View style={[styles.likeIcon, styles.likeIconRight]}>
                <MaterialIcons name="favorite" size={12} color="#ff0000" />
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={handleOpenProfile}
        >
          <Avatar
            firstname={otherUserName.split(' ')[0]}
            lastname={otherUserName.split(' ')[1]}
            photo={otherUserPhoto ?? undefined}
            size={40}
            bgColor={theme.colors.card}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{otherUserName}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>Match via {eventName}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setShowMenu(true)} style={styles.headerBtn}>
          <MaterialIcons name="more-vert" size={24} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <ConversationSkeleton theme={theme} />
      ) : messages.length === 0 ? (
        <View style={[styles.emptyConv, { flex: 1, backgroundColor: theme.colors.background }]}>
          <View style={styles.emptyConvIcon}>
            <MaterialIcons name="chat-bubble-outline" size={32} color={theme.colors.placeholder} />
          </View>
          <Text style={styles.emptyConvText}>Commencez la conversation !</Text>
          <Text style={styles.emptyConvSub}>Envoyez un premier message à {otherUserName}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={item => item.dateKey}
          renderItem={renderDateGroup}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
        />
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <TypingDots color={theme.colors.placeholder} />
          <Text style={styles.typingText}>{otherUserName.split(' ')[0]} écrit...</Text>
        </View>
      )}

      {/* Input zone */}
      <View style={styles.inputContainer}>
        {isArchived ? (
          <View style={styles.statusBanner}>
            <MaterialIcons name="block" size={16} color={theme.colors.destructive} />
            <Text style={styles.statusBannerText}>Vous avez été retiré de cet événement par l'organisateur</Text>
          </View>
        ) : isOtherUserBlocked ? (
          <View style={[styles.statusBanner, styles.statusBannerGray]}>
            <MaterialIcons name="person-off" size={16} color={theme.colors.mutedForeground} />
            <Text style={[styles.statusBannerText, { color: theme.colors.mutedForeground }]}>Cet utilisateur a été retiré de l'événement</Text>
          </View>
        ) : isEventExpired ? (
          <View style={[styles.statusBanner, styles.statusBannerOrange]}>
            <MaterialIcons name="schedule" size={16} color={theme.warning} />
            <Text style={[styles.statusBannerText, { color: theme.warning }]}>La période de disponibilité de cet événement est terminée</Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                sendTyping(text.length > 0);
              }}
              onBlur={() => sendTyping(false)}
              placeholder="Écrivez un message..."
              placeholderTextColor={theme.colors.placeholder}
              style={styles.input}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
              style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
            >
              <MaterialIcons name="send" size={20} color={theme.colors.primaryForeground} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Dropdown menu */}
      <Modal visible={showMenu} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); setReportType(null); setReportDesc(''); setShowReport(true); }}
            >
              <MaterialIcons name="flag" size={18} color={theme.colors.destructive} />
              <Text style={styles.menuItemText}>Signaler l'utilisateur</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Profile modal */}
      <Modal visible={showProfile} transparent statusBarTranslucent animationType="fade" onRequestClose={() => setShowProfile(false)}>
        <Pressable style={styles.profileOverlay} onPress={() => setShowProfile(false)}>
          <Pressable style={styles.profileModal} onPress={(e) => e.stopPropagation()}>
            <Pressable onPress={() => setShowProfile(false)} style={styles.profileCloseBtn}>
              <MaterialIcons name="close" size={20} color="#FFF" />
            </Pressable>

            {loadingProfile ? (
              <View style={styles.profileLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : profileData ? (
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {/* Photo carousel */}
                <View style={styles.profilePhotoContainer}>
                  {profileData.photos && profileData.photos.length > 0 ? (
                    <>
                      <Image
                        source={{ uri: getPhotoUri(profileData.photos[profilePhotoIndex]?.file_path) || undefined }}
                        style={styles.profilePhoto}
                        resizeMode="cover"
                      />
                      {profileData.photos.length > 1 && (
                        <>
                          <View style={styles.profilePhotoIndicators}>
                            {profileData.photos.map((_, idx) => (
                              <View key={idx} style={[styles.profilePhotoIndicator, idx === profilePhotoIndex && styles.profilePhotoIndicatorActive]} />
                            ))}
                          </View>
                          {profilePhotoIndex > 0 && (
                            <Pressable style={[styles.profilePhotoNav, styles.profilePhotoNavLeft]} onPress={() => setProfilePhotoIndex(i => i - 1)}>
                              <MaterialIcons name="chevron-left" size={28} color="#FFF" />
                            </Pressable>
                          )}
                          {profilePhotoIndex < profileData.photos.length - 1 && (
                            <Pressable style={[styles.profilePhotoNav, styles.profilePhotoNavRight]} onPress={() => setProfilePhotoIndex(i => i + 1)}>
                              <MaterialIcons name="chevron-right" size={28} color="#FFF" />
                            </Pressable>
                          )}
                        </>
                      )}
                      {/* Name overlay */}
                      <View style={styles.profileNameOverlay}>
                        <Text style={styles.profileNameText}>
                          {profileData.firstname} {profileData.lastname?.charAt(0)}.
                          {calculateAge(profileData.birthday) ? `, ${calculateAge(profileData.birthday)}` : ''}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.profileNoPhoto}>
                      <Avatar
                        firstname={profileData.firstname}
                        lastname={profileData.lastname}
                        size={100}
                        bgColor={theme.colors.border}
                      />
                      <Text style={[styles.profileNameText, { color: theme.colors.foreground, marginTop: 12 }]}>
                        {profileData.firstname} {profileData.lastname?.charAt(0)}.
                        {calculateAge(profileData.birthday) ? `, ${calculateAge(profileData.birthday)}` : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Profile info */}
                <View style={styles.profileInfoSection}>
                  {profileData.profil_info && Object.keys(profileData.profil_info).length > 0 ? (
                    Object.entries(profileData.profil_info).map(([key, value]) => {
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;
                      return (
                        <View key={key} style={styles.profileInfoRow}>
                          <Text style={styles.profileInfoLabel}>{formatFieldLabel(key)}</Text>
                          {Array.isArray(value) ? (
                            <View style={styles.profileInfoTags}>
                              {value.map((v, i) => (
                                <View key={i} style={styles.profileInfoTag}>
                                  <Text style={styles.profileInfoTagText}>{String(v)}</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.profileInfoValue}>{String(value)}</Text>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.profileInfoEmpty}>Aucune information de profil disponible</Text>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report modal */}
      <SlideUpModal visible={showReport} onRequestClose={() => setShowReport(false)} overlayColor={theme.colors.overlay} position="center">
        <View style={styles.reportBox}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Signaler {otherUserName}</Text>
            <Pressable onPress={() => setShowReport(false)}>
              <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {!reportType ? (
            <>
              <Text style={styles.reportSubtitle}>Que souhaitez-vous signaler ?</Text>
              <View style={styles.reportOptions}>
                <Pressable style={styles.reportOption} onPress={() => setReportType('photo')}>
                  <Text style={styles.reportOptionTitle}>Photo inappropriée</Text>
                  <Text style={styles.reportOptionSub}>Image choquante ou offensante</Text>
                </Pressable>
                <Pressable style={styles.reportOption} onPress={() => setReportType('profile')}>
                  <Text style={styles.reportOptionTitle}>Profil offensant</Text>
                  <Text style={styles.reportOptionSub}>Informations inappropriées</Text>
                </Pressable>
                <Pressable style={styles.reportOption} onPress={() => setReportType('message')}>
                  <Text style={styles.reportOptionTitle}>Message offensant</Text>
                  <Text style={styles.reportOptionSub}>Contenu des messages problématique</Text>
                </Pressable>
              </View>
              <Pressable style={styles.reportCancelBtn} onPress={() => setShowReport(false)}>
                <Text style={styles.reportCancelText}>Annuler</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.reportSubtitle}>Ajoutez des détails si nécessaire</Text>
              <TextInput
                value={reportDesc}
                onChangeText={setReportDesc}
                placeholder="Décrivez la situation pour aider l'organisateur..."
                placeholderTextColor={theme.colors.placeholder}
                style={styles.reportTextarea}
                multiline
                numberOfLines={4}
              />
              <View style={styles.reportActions}>
                <Pressable style={styles.reportBackBtn} onPress={() => setReportType(null)} disabled={submittingReport}>
                  <Text style={styles.reportBackText}>Retour</Text>
                </Pressable>
                <Pressable style={[styles.reportSubmitBtn, submittingReport && { opacity: 0.6 }]} onPress={handleReportSubmit} disabled={submittingReport}>
                  {submittingReport ? <ActivityIndicator size="small" color={theme.colors.primaryForeground} /> : <Text style={styles.reportSubmitText}>Signaler</Text>}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </SlideUpModal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme, topInset: number, bottomInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: topInset + 8, paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  headerName: { fontWeight: '600', color: theme.colors.foreground, fontSize: 15 },
  headerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  messagesContainer: { flex: 1, backgroundColor: theme.colors.background },
  messagesContent: { padding: 16, paddingBottom: 12 },
  emptyConv: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyConvIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyConvText: { fontWeight: '600', color: theme.colors.foreground, fontSize: 15 },
  emptyConvSub: { color: theme.colors.placeholder, fontSize: 13, marginTop: 4 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: { fontSize: 12, color: theme.colors.placeholder, backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMe: { backgroundColor: theme.colors.sentMsg, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: theme.colors.receivedMsg, borderBottomLeftRadius: 4, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: theme.colors.sentMsgText },
  bubbleTextOther: { color: theme.colors.foreground },
  bubbleTime: { fontSize: 11, marginTop: 3 },
  bubbleTimeMe: { color: theme.colors.textMuted, textAlign: 'right' },
  bubbleTimeOther: { color: theme.colors.placeholder },
  likeIcon: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  likeIconRight: { right: 4 },
  typingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: theme.colors.background },
  typingText: { fontSize: 12, color: theme.colors.placeholder, fontStyle: 'italic' },
  inputContainer: { backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.secondary, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Math.max(bottomInset, 10) },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: theme.colors.foreground, maxHeight: 100, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.sentMsg, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.errorLight, borderRadius: 12, padding: 12 },
  statusBannerGray: { backgroundColor: theme.colors.secondary },
  statusBannerOrange: { backgroundColor: theme.warningLight },
  statusBannerText: { flex: 1, fontSize: 13, color: theme.colors.destructive, lineHeight: 18 },
  menuOverlay: { flex: 1, backgroundColor: theme.colors.overlay },
  menuBox: { position: 'absolute', top: 80, right: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 6, minWidth: 200, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuItemText: { color: theme.colors.destructive, fontWeight: '500', fontSize: 14 },
  reportBox: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reportTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: theme.colors.foreground },
  reportSubtitle: { fontSize: 13, color: theme.colors.mutedForeground, marginBottom: 16 },
  reportOptions: { gap: 10 },
  reportOption: { backgroundColor: theme.colors.secondary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  reportOptionTitle: { fontWeight: '600', color: theme.colors.foreground, fontSize: 14 },
  reportOptionSub: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  reportCancelBtn: { marginTop: 16, alignItems: 'center', padding: 12 },
  reportCancelText: { color: theme.colors.mutedForeground, fontWeight: '500' },
  reportTextarea: { borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.foreground, minHeight: 100, textAlignVertical: 'top', fontSize: 14 },
  reportActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  reportBackBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.secondary, alignItems: 'center' },
  reportBackText: { fontWeight: '600', color: theme.colors.foreground },
  reportSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.destructive, alignItems: 'center', justifyContent: 'center' },
  reportSubmitText: { fontWeight: '600', color: theme.colors.primaryForeground },
  // Profile modal
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  profileModal: { backgroundColor: theme.colors.card, borderRadius: 20, maxHeight: '85%', overflow: 'hidden' },
  profileCloseBtn: { position: 'absolute', top: 12, right: 12, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  profileLoading: { height: 300, alignItems: 'center', justifyContent: 'center' },
  profilePhotoContainer: { height: Dimensions.get('window').height * 0.4, backgroundColor: theme.colors.border, overflow: 'hidden' },
  profilePhoto: { width: '100%', height: '100%' },
  profilePhotoIndicators: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4, paddingHorizontal: 16 },
  profilePhotoIndicator: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  profilePhotoIndicatorActive: { backgroundColor: '#FFF' },
  profilePhotoNav: { position: 'absolute', top: '50%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  profilePhotoNavLeft: { left: 8 },
  profilePhotoNavRight: { right: 8 },
  profileNameOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.4)' },
  profileNameText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  profileNoPhoto: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary },
  profileInfoSection: { padding: 16, gap: 12 },
  profileInfoRow: { gap: 4 },
  profileInfoLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedForeground, textTransform: 'capitalize' },
  profileInfoValue: { fontSize: 14, color: theme.colors.foreground },
  profileInfoTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  profileInfoTag: { backgroundColor: theme.colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  profileInfoTagText: { fontSize: 13, color: theme.colors.foreground },
  profileInfoEmpty: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', paddingVertical: 16 },
});
