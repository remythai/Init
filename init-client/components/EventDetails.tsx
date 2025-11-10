import { MaterialIcons } from "@expo/vector-icons";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export interface Event {
  id: string;
  name: string;
  theme: string;
  date: string;
  location: string;
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
}

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onRegister: (eventId: string) => void;
  onEnterEvent?: (event: Event) => void;
}

export function EventDetail({
  event,
  onBack,
  onRegister,
  onEnterEvent,
}: EventDetailProps) {
  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      musique: "#a855f7",
      professionnel: "#3b82f6",
      étudiant: "#22c55e",
      sport: "#f97316",
      café: "#f59e0b",
      fête: "#ec4899",
    };
    return colors[theme.toLowerCase()] || "#6b7280";
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />
          
          {/* Theme Badge */}
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.themeBadge,
                { backgroundColor: getThemeColor(event.theme) },
              ]}
            >
              <Text style={styles.badgeText}>{event.theme}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Event Name */}
          <Text style={styles.eventName}>{event.name}</Text>

          {/* Info Cards */}
          <View style={styles.infoSection}>
            {/* Date */}
            <View style={styles.infoCard}>
              <MaterialIcons name="event" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Date</Text>
                <Text style={styles.infoCardText}>{event.date}</Text>
              </View>
            </View>

            {/* Time */}
            <View style={styles.infoCard}>
              <MaterialIcons name="access-time" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Heure</Text>
                <Text style={styles.infoCardText}>18:00 - 22:00</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.infoCard}>
              <MaterialIcons name="place" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Lieu</Text>
                <Text style={styles.infoCardText}>{event.location}</Text>
              </View>
            </View>

            {/* Participants */}
            <View style={styles.infoCard}>
              <MaterialIcons name="group" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Participants</Text>
                <Text style={styles.infoCardText}>
                  {event.participants}/{event.maxParticipants} inscrits
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (event.participants / event.maxParticipants) * 100
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos de l'événement</Text>
            <Text style={styles.description}>
              {event.description ||
                "Rejoignez-nous pour un moment unique de partage et de rencontre. Cet événement est l'occasion parfaite pour élargir votre réseau et faire de nouvelles connexions dans une ambiance conviviale et décontractée."}
            </Text>
          </View>

          {/* Organizer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisateur</Text>
            <View style={styles.organizerCard}>
              <View style={styles.organizerAvatar}>
                <Text style={styles.organizerAvatarText}>O</Text>
              </View>
              <View style={styles.organizerInfo}>
                <Text style={styles.organizerName}>Organisation Init</Text>
                <Text style={styles.organizerBadge}>Organisateur vérifié</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <Pressable
          style={styles.actionButton}
          onPress={() =>
            event.isRegistered ? onEnterEvent?.(event) : onRegister(event.id)
          }
        >
          <Text style={styles.actionButtonText}>
            {event.isRegistered
              ? "Entrer dans l'événement"
              : "Participer à cet événement"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: 256,
  },
  eventImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  themeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  eventName: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 24,
    color: "#303030",
    marginBottom: 16,
  },
  infoSection: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 14,
    color: "#303030",
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E0E7FF",
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1271FF",
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  organizerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },
  organizerAvatarText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 20,
    color: "#303030",
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 16,
    color: "#303030",
    marginBottom: 2,
  },
  organizerBadge: {
    fontSize: 12,
    color: "#6b7280",
  },
  actionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButton: {
    backgroundColor: "#303030",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonText: {
    fontFamily: "Poppins",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});