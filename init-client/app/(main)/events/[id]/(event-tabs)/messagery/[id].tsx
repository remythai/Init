// app/(main)/events/[id]/(event-tabs)/messagery/[id].tsx
import { useEvent } from "@/context/EventContext";
import { matchService } from "@/services/match.service";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Flag, MoreVertical, Send } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
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
} from "react-native";

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
  senderId: "me" | "other";
  text: string;
  timestamp: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const { currentEventId } = useEvent();
  const params = useLocalSearchParams<{ id: string }>();
  const matchId = params.id ? parseInt(params.id) : 0;

  // ✅ Log pour debug
  console.log('💬 Conversation - matchId:', matchId, 'currentEventId:', currentEventId, 'params:', params);

  const scrollViewRef = useRef<ScrollView>(null);

  const [messageText, setMessageText] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserName, setOtherUserName] = useState<string>("Match");
  const [eventName, setEventName] = useState<string>("Événement");

  // ✅ Retour vers la messagerie d'event avec l'ID explicite
  const goBackToMessagery = useCallback(() => {
    if (currentEventId) {
      console.log('🔙 Retour vers messagery, eventId:', currentEventId);
      // ✅ IMPORTANT : Inclure l'ID de l'événement dans l'URL
      router.replace(`/(main)/events/${currentEventId}/(event-tabs)/messagery`);
    } else {
      console.warn('⚠️ Pas de currentEventId, retour vers events');
      router.replace('/(main)/events');
    }
  }, [currentEventId, router]);

  // ✅ Back hardware Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        goBackToMessagery();
        return true; // ✅ Empêche le comportement par défaut
      };
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [goBackToMessagery])
  );

  // Auto scroll en bas
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      scrollToBottom
    );
    return () => keyboardDidShowListener.remove();
  }, []);

  // Chargement des messages depuis l'API
  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (!matchId) return;

        const res = await matchService.getMessages(matchId);
        const { match, messages: apiMessages } = res;

        setEventName(match.event_name || "Événement");
        setOtherUserName(
          `${match.user.firstname} ${match.user.lastname}`.trim() || "Match"
        );

        const mapped: Message[] = apiMessages.map((m: ApiMessage) => ({
          id: m.id.toString(),
          senderId: m.sender_id === match.user.id ? "other" : "me",
          text: m.content,
          timestamp: new Date(m.sent_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(mapped);
      } catch (e) {
        console.error("Erreur chargement messages:", e);
      }
    };

    loadMessages();
  }, [matchId]);

  // Envoi de message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !matchId) return;

    const content = messageText.trim();
    setMessageText("");

    const optimistic: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: content,
      timestamp: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const sent = await matchService.sendMessage(matchId, content);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? {
                ...m,
                id: sent.id.toString(),
              }
            : m
        )
      );
    } catch (e) {
      console.error("Erreur envoi message:", e);
    }
  };

  const handleReport = () => {
    console.log("Signalement de l'utilisateur:", otherUserName);
    setShowReportDialog(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBackToMessagery} style={styles.headerButton}>
          <ArrowLeft size={24} color="white" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{otherUserName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{otherUserName}</Text>
            <Text style={styles.headerSubtitle}>
              Match via {eventName}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setShowDropdownMenu(true)}
          style={styles.headerButton}
        >
          <MoreVertical size={24} color="white" />
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.senderId === "me"
                ? styles.messageRowRight
                : styles.messageRowLeft,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.senderId === "me"
                  ? styles.messageBubbleMe
                  : styles.messageBubbleOther,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.senderId === "me"
                    ? styles.messageTextMe
                    : styles.messageTextOther,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.senderId === "me"
                    ? styles.messageTimeMe
                    : styles.messageTimeOther,
                ]}
              >
                {message.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          onSubmitEditing={handleSendMessage}
          placeholder="Votre message..."
          placeholderTextColor="#9E9E9E"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showDropdownMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdownMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdownMenu(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              onPress={() => {
                setShowDropdownMenu(false);
                setShowReportDialog(true);
              }}
              style={styles.dropdownItem}
            >
              <Flag size={16} color="#DC2626" />
              <Text style={styles.dropdownItemText}>Signaler l'utilisateur</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Report Dialog */}
      <Modal
        visible={showReportDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>
              Signaler {otherUserName}
            </Text>
            <Text style={styles.dialogDescription}>
              Voulez-vous vraiment signaler cet utilisateur ? Cette action
              permettra à notre équipe de modération d'examiner le comportement
              de cette personne.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => setShowReportDialog(false)}
                style={styles.dialogButtonCancel}
              >
                <Text style={styles.dialogButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReport}
                style={styles.dialogButtonConfirm}
              >
                <Text style={styles.dialogButtonConfirmText}>Signaler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#303030",
    borderBottomWidth: 1,
    borderBottomColor: "#303030",
  },
  headerButton: { padding: 8, borderRadius: 8 },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#303030", fontWeight: "600" },
  headerName: { fontWeight: "600", color: "white" },
  headerSubtitle: { fontSize: 12, color: "rgba(255, 255, 255, 0.7)" },
  messagesContainer: { flex: 1, backgroundColor: "#F5F5F5" },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: "row", marginBottom: 12 },
  messageRowRight: { justifyContent: "flex-end" },
  messageRowLeft: { justifyContent: "flex-start" },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageBubbleMe: { backgroundColor: "#303030" },
  messageBubbleOther: { backgroundColor: "white" },
  messageText: { fontSize: 14 },
  messageTextMe: { color: "white" },
  messageTextOther: { color: "#303030" },
  messageTime: { fontSize: 12, marginTop: 4 },
  messageTimeMe: { color: "#E3F2FD" },
  messageTimeOther: { color: "#9E9E9E" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "white",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#303030",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#303030",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  dropdownMenu: {
    position: "absolute",
    top: 80,
    right: 16,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  dropdownItemText: { color: "#DC2626" },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialogBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  dialogTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  dialogDescription: { color: "#757575", marginBottom: 24 },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  dialogButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BDBDBD",
  },
  dialogButtonCancelText: { color: "#000" },
  dialogButtonConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#DC2626",
  },
  dialogButtonConfirmText: { color: "white" },
});