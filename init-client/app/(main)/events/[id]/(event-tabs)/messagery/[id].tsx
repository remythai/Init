// app/(main)/events/[id]/(event-tabs)/messagery/[id].tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useEvent } from '@/context/EventContext';
import { matchService } from '@/services/match.service';
import { reportService, ReportType } from '@/services/report.service';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { Avatar } from '@/components/ui/Avatar';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
  date: string; // YYYY-MM-DD for grouping
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

export default function ConversationPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);
  const { currentEventId } = useEvent();
  const { id: matchIdParam } = useLocalSearchParams<{ id: string }>();
  const globalParams = useGlobalSearchParams<{ from?: string }>();
  const fromGlobal = globalParams.from === 'global';
  const matchId = matchIdParam ? parseInt(matchIdParam) : 0;

  const scrollViewRef = useRef<ScrollView>(null);

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

  // Report modal
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const goBack = useCallback(() => {
    const eid = eventId || currentEventId;
    if (fromGlobal) router.replace('/(main)/messagery');
    else if (eid) router.replace(`/(main)/events/${eid}/(event-tabs)/messagery`);
    else router.replace('/(main)/messagery');
  }, [eventId, currentEventId, router, fromGlobal]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
      return () => sub.remove();
    }, [goBack])
  );

  const scrollToBottom = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
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

      // Photo from match user
      const photos = match.user.photos;
      if (photos && photos.length > 0) {
        setOtherUserPhoto(getPhotoUri(photos[0].file_path));
      }

      // Check conversation state from conversations list
      // Try to get conv info if available
      setIsArchived(res.is_blocked || false);
      setIsEventExpired(res.is_event_expired || false);
      setIsOtherUserBlocked(res.is_other_user_blocked || false);

      const mapped: Message[] = apiMessages.map((m: ApiMessage) => ({
        id: m.id.toString(),
        senderId: m.sender_id === match.user.id ? 'other' : 'me',
        text: m.content,
        timestamp: formatMsgTime(m.sent_at),
        date: toDateKey(m.sent_at),
      }));
      setMessages(mapped);
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

  const canSend = !isArchived && !isEventExpired && !isOtherUserBlocked;

  // Group messages by date
  const groupedMessages: { dateLabel: string; dateKey: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.dateKey === msg.date) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ dateKey: msg.date, dateLabel: formatDateLabel(msg.date + 'T12:00:00'), messages: [msg] });
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
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
        </View>
        <Pressable onPress={() => setShowMenu(true)} style={styles.headerBtn}>
          <MaterialIcons name="more-vert" size={24} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Messages */}
      {loading ? (
        <ScreenLoader />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyConv}>
              <View style={styles.emptyConvIcon}>
                <MaterialIcons name="chat-bubble-outline" size={32} color={theme.colors.placeholder} />
              </View>
              <Text style={styles.emptyConvText}>Commencez la conversation !</Text>
              <Text style={styles.emptyConvSub}>Envoyez un premier message à {otherUserName}</Text>
            </View>
          ) : (
            groupedMessages.map(group => (
              <View key={group.dateKey}>
                {/* Date separator */}
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateSeparatorText}>{group.dateLabel}</Text>
                </View>
                {group.messages.map(msg => (
                  <View
                    key={msg.id}
                    style={[styles.msgRow, msg.senderId === 'me' ? styles.msgRowRight : styles.msgRowLeft]}
                  >
                    <View style={[styles.bubble, msg.senderId === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, msg.senderId === 'me' ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                        {msg.text}
                      </Text>
                      <Text style={[styles.bubbleTime, msg.senderId === 'me' ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                        {msg.timestamp}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
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
              onChangeText={setMessageText}
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
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
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

      {/* Report modal — multi-step like web */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <View style={styles.reportOverlay}>
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
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme, topInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.card },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: topInset, paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerBtn: { padding: 8, borderRadius: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  headerName: { fontWeight: '600', color: theme.colors.foreground, fontSize: 15 },
  headerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  messagesContainer: { flex: 1, backgroundColor: theme.colors.background },
  messagesContent: { padding: 16, paddingBottom: 12 },
  emptyConv: { alignItems: 'center', paddingVertical: 60 },
  emptyConvIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyConvText: { fontWeight: '600', color: theme.colors.foreground, fontSize: 15 },
  emptyConvSub: { color: theme.colors.placeholder, fontSize: 13, marginTop: 4 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: { fontSize: 12, color: theme.colors.placeholder, backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMe: { backgroundColor: theme.colors.sentMsg, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: theme.colors.receivedMsg, borderBottomLeftRadius: 4, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: theme.colors.sentMsgText },
  bubbleTextOther: { color: theme.colors.foreground },
  bubbleTime: { fontSize: 11, marginTop: 3 },
  bubbleTimeMe: { color: theme.colors.textMuted, textAlign: 'right' },
  bubbleTimeOther: { color: theme.colors.placeholder },
  inputContainer: { backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.secondary, paddingHorizontal: 12, paddingVertical: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: theme.colors.foreground, maxHeight: 100, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.sentMsg, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.errorLight, borderRadius: 12, padding: 12,
  },
  statusBannerGray: { backgroundColor: theme.colors.secondary },
  statusBannerOrange: { backgroundColor: theme.warningLight },
  statusBannerText: { flex: 1, fontSize: 13, color: theme.colors.destructive, lineHeight: 18 },
  // Menu
  menuOverlay: { flex: 1, backgroundColor: theme.colors.overlay },
  menuBox: { position: 'absolute', top: 80, right: 12, backgroundColor: theme.colors.card, borderRadius: 12, padding: 6, minWidth: 200, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuItemText: { color: theme.colors.destructive, fontWeight: '500', fontSize: 14 },
  // Report
  reportOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
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
});
