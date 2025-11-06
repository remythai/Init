import { Calendar, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import {
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

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

interface EventsListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onEnterEvent?: (event: Event) => void;
}

const Badge = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.badge, style]}>
    <Text style={styles.badgeText}>{children}</Text>
  </View>
);

export function EventsList({ events, onEventClick, onEnterEvent }: EventsListProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "registered">("all");

  const filteredEvents = events.filter((event) =>
    activeFilter === "all" ? true : event.isRegistered
  );

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      musique: "#A855F7",
      professionnel: "#3B82F6",
      étudiant: "#10B981",
      sport: "#F97316",
      café: "#F59E0B",
      fête: "#EC4899",
    };
    return colors[theme.toLowerCase()] || "#6B7280";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeFilter === "registered"
                ? "Vous n'êtes inscrit à aucun événement"
                : "Aucun événement disponible"}
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <View key={event.id} style={styles.card}>
              <TouchableOpacity
                onPress={() => onEventClick(event)}
                activeOpacity={0.9}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: event.image }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.topLeft}>
                    <Badge style={{ backgroundColor: getThemeColor(event.theme) }}>
                      {event.theme}
                    </Badge>
                  </View>
                  {event.isRegistered && (
                    <View style={styles.topRight}>
                      <Badge style={{ backgroundColor: "#10B981" }}>
                        Inscrit
                      </Badge>
                    </View>
                  )}
                </View>

                <View style={styles.content}>
                  <Text style={styles.title}>{event.name}</Text>

                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <Calendar size={16} color="#303030" />
                      <Text style={styles.infoText}>{event.date}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <MapPin size={16} color="#303030" />
                      <Text style={styles.infoText}>{event.location}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Users size={16} color="#303030" />
                      <Text style={styles.infoText}>
                        {event.participants}/{event.maxParticipants} participants
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${(event.participants / event.maxParticipants) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {event.isRegistered && onEnterEvent && (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={() => onEnterEvent(event)}
                    style={styles.enterButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.enterButtonText}>
                      Accéder à l'environnement
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.filterContainer}>
        <View style={styles.filterWrapper}>
          <TouchableOpacity
            onPress={() => setActiveFilter("all")}
            style={[
              styles.filterButton,
              activeFilter === "all" && styles.filterButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === "all" && styles.filterButtonTextActive,
              ]}
            >
              Tous les événements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFilter("registered")}
            style={[
              styles.filterButton,
              activeFilter === "registered" && styles.filterButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === "registered" && styles.filterButtonTextActive,
              ]}
            >
              Mes événements
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: 192,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topLeft: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  topRight: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  title: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  infoContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressBarContainer: {
    marginTop: 12,
    width: "100%",
    backgroundColor: "#E0E7FF",
    borderRadius: 9999,
    height: 8,
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: "#1271FF",
    height: 8,
    borderRadius: 9999,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  enterButton: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: "#303030",
    borderRadius: 8,
    alignItems: "center",
  },
  enterButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  filterContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    padding: 16,
    paddingBottom: 24,
  },
  filterWrapper: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 4,
    borderRadius: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#303030",
  },
  filterButtonText: {
    color: "#303030",
    fontWeight: "600",
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
});