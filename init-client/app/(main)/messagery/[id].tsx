import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Flag,
  MoreVertical,
  Send,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
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

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export default function ConversationPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messageText, setMessageText] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "other",
      text: "Salut ! Content de te rencontrer à l'événement !",
      timestamp: "09:15",
    },
    {
      id: "2",
      senderId: "me",
      text: "Salut ! Oui c'était super !",
      timestamp: "09:18",
    },
    {
      id: "3",
      senderId: "other",
      text: "Tu vas souvent à ce genre d'événements ?",
      timestamp: "09:20",
    },
    {
      id: "4",
      senderId: "me",
      text: "Oui, j'adore découvrir de nouveaux endroits et rencontrer des gens",
      timestamp: "09:22",
    },
    {
      id: "5",
      senderId: "other",
      text: "C'est cool ! Moi aussi j'essaie d'y aller régulièrement",
      timestamp: "09:25",
    },
    {
      id: "6",
      senderId: "me",
      text: "Tu as préféré quoi hier soir ?",
      timestamp: "09:27",
    },
    {
      id: "7",
      senderId: "other",
      text: "Franchement l'ambiance était incroyable, et la musique était parfaite",
      timestamp: "09:30",
    },
    {
      id: "8",
      senderId: "me",
      text: "Ouais carrément ! Le DJ était vraiment bon",
      timestamp: "09:32",
    },
    {
      id: "9",
      senderId: "other",
      text: "Tu connais d'autres bons événements à venir ?",
      timestamp: "09:35",
    },
    {
      id: "10",
      senderId: "me",
      text: "Il y a un concert la semaine prochaine au Zenith, ça devrait être pas mal",
      timestamp: "09:38",
    },
    {
      id: "11",
      senderId: "other",
      text: "Ah ouais ? C'est quel genre de musique ?",
      timestamp: "09:40",
    },
    {
      id: "12",
      senderId: "me",
      text: "Plutôt électro/house, mais avec un bon mix",
      timestamp: "09:42",
    },
    {
      id: "13",
      senderId: "other",
      text: "Ça me tente bien ! Tu y vas avec des amis ?",
      timestamp: "09:45",
    },
    {
      id: "14",
      senderId: "me",
      text: "Oui on sera un petit groupe, tu veux te joindre à nous ?",
      timestamp: "09:47",
    },
    {
      id: "15",
      senderId: "other",
      text: "Carrément ! Ça serait cool 😊",
      timestamp: "09:50",
    },
    {
      id: "16",
      senderId: "me",
      text: "Super ! Je t'envoie les détails plus tard dans la semaine",
      timestamp: "09:52",
    },
    {
      id: "17",
      senderId: "other",
      text: "Parfait, merci ! Au fait, tu fais quoi dans la vie ?",
      timestamp: "10:00",
    },
    {
      id: "18",
      senderId: "me",
      text: "Je suis développeur web, et toi ?",
      timestamp: "10:02",
    },
    {
      id: "19",
      senderId: "other",
      text: "Ah cool ! Moi je suis dans le design graphique",
      timestamp: "10:05",
    },
    {
      id: "20",
      senderId: "me",
      text: "Sympa ! On pourrait même collaborer un jour 😄",
      timestamp: "10:07",
    },
    {
      id: "21",
      senderId: "other",
      text: "Pourquoi pas ! J'aime bien travailler avec des devs qui comprennent le design",
      timestamp: "10:10",
    },
    {
      id: "22",
      senderId: "me",
      text: "Haha oui c'est important la communication entre dev et design",
      timestamp: "10:12",
    },
    {
      id: "23",
      senderId: "other",
      text: "Totalement d'accord ! Bon je dois y aller, on se reparle bientôt ?",
      timestamp: "10:15",
    },
    {
      id: "24",
      senderId: "me",
      text: "Oui bien sûr ! Bonne journée 👋",
      timestamp: "10:17",
    },
    {
      id: "25",
      senderId: "other",
      text: "Toi aussi ! À plus",
      timestamp: "10:18",
    },
  ]);

  const selectedMatch = {
    id: id as string,
    name: "Marie",
    eventName: "Soirée Jazz",
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollToBottom();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([...messages, newMessage]);
    setMessageText("");
  };

  const handleReport = () => {
    console.log("Signalement de l'utilisateur:", selectedMatch.name);
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
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <ArrowLeft size={24} color="white" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {selectedMatch.name.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{selectedMatch.name}</Text>
            <Text style={styles.headerSubtitle}>
              Match via {selectedMatch.eventName}
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
              message.senderId === "me" ? styles.messageRowRight : styles.messageRowLeft,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.senderId === "me" ? styles.messageBubbleMe : styles.messageBubbleOther,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.senderId === "me" ? styles.messageTextMe : styles.messageTextOther,
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.senderId === "me" ? styles.messageTimeMe : styles.messageTimeOther,
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
              Signaler {selectedMatch.name}
            </Text>
            <Text style={styles.dialogDescription}>
              Voulez-vous vraiment signaler cet utilisateur ? Cette action permettra à notre
              équipe de modération d'examiner le comportement de cette personne.
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

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
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
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
  avatarText: {
    color: "#303030",
    fontWeight: "600",
  },
  headerName: {
    fontWeight: "600",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },

  messagesContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageBubbleMe: {
    backgroundColor: "#303030",
  },
  messageBubbleOther: {
    backgroundColor: "white",
  },
  messageText: {
    fontSize: 14,
  },
  messageTextMe: {
    color: "white",
  },
  messageTextOther: {
    color: "#303030",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  messageTimeMe: {
    color: "#E3F2FD",
  },
  messageTimeOther: {
    color: "#9E9E9E",
  },

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
  dropdownItemText: {
    color: "#DC2626",
  },

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
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  dialogDescription: {
    color: "#757575",
    marginBottom: 24,
  },
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
  dialogButtonCancelText: {
    color: "#000",
  },
  dialogButtonConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#DC2626",
  },
  dialogButtonConfirmText: {
    color: "white",
  },
});
