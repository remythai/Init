// components/EventsList.tsx
import { type Theme } from "@/constants/theme";
import { shared, useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CreateEventDialog } from "./CreateEventDialog";

export interface Event {
  id: string;
  name: string;
  theme: string;
  physicalDate: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  hasPhysicalEvent: boolean;
  appDate: string;
  appStartAt: string;
  appEndAt: string;
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
  isBlocked?: boolean;
  customFields?: any[];
  orgaName?: string;
  orgaLogo?: string;
  hasWhitelist?: boolean;
  bannerPath?: string;
}

interface EventsListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onEnterEvent?: (event: Event) => void;
  userType?: "user" | "organizer";
  onCreateEvent?: () => void;
}

export function EventsList({
  events,
  onEventClick,
  onEnterEvent,
  userType,
  onCreateEvent,
}: EventsListProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

  const [activeFilter, setActiveFilter] = useState<"all" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [locationQuery, setLocationQuery] = useState("");

  const isScrolling = useRef(false);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height - 70,
          duration: (e as any).duration || 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: (e as any).duration || 250,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesFilter = activeFilter === "all" ? true : event.isRegistered;
    const locationStr = event.location || "";
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      locationStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationQuery ||
      locationStr.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesTheme =
      selectedTheme === "all" ||
      event.theme.toLowerCase() === selectedTheme.toLowerCase();
    const matchesAvailability =
      !onlyAvailable || event.participants < event.maxParticipants;
    return matchesFilter && matchesSearch && matchesLocation && matchesTheme && matchesAvailability;
  });

  const resetAdvancedFilters = () => {
    setMaxDistance(50);
    setSelectedTheme("all");
    setOnlyAvailable(false);
    setDateFilter("all");
    setLocationQuery("");
    setActiveFilter("all");
  };

  const hasActiveAdvancedFilters =
    maxDistance !== 50 || selectedTheme !== "all" || onlyAvailable ||
    dateFilter !== "all" || !!locationQuery || activeFilter !== "all";

  const getThemeColor = (eventTheme: string) => {
    return shared.eventTheme[eventTheme.toLowerCase()] || shared.eventTheme.général;
  };

  const themes = [
    { value: "all", label: "Tous" },
    { value: "musique", label: "Musique" },
    { value: "professionnel", label: "Pro" },
    { value: "étudiant", label: "Étudiant" },
    { value: "sport", label: "Sport" },
    { value: "café", label: "Café" },
    { value: "fête", label: "Fête" },
  ];

  const dateFilters = [
    { value: "all", label: "Toutes les dates" },
    { value: "today", label: "Aujourd'hui" },
    { value: "week", label: "Cette semaine" },
    { value: "month", label: "Ce mois-ci" },
  ];

  const fillPct = (event: Event) =>
    Math.min((event.participants / event.maxParticipants) * 100, 100);

  return (
    <View style={styles.container}>
      {/* Search Bars */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <MaterialIcons name="search" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un événement..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>
          <Pressable style={styles.filterButton} onPress={() => setIsAdvancedOpen(true)}>
            <MaterialIcons name="tune" size={20} color={theme.colors.foreground} />
            {hasActiveAdvancedFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        {/* Location search */}
        <View style={styles.locationWrapper}>
          <MaterialIcons name="place" size={18} color={theme.colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Lieu..."
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholderTextColor={theme.colors.placeholder}
          />
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onScrollEndDrag={() => { isScrolling.current = false; }}
        onMomentumScrollEnd={() => { isScrolling.current = false; }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={48} color={theme.colors.placeholder} />
            <Text style={styles.emptyTitle}>Aucun événement</Text>
            <Text style={styles.emptyText}>
              {searchQuery || locationQuery
                ? "Aucun événement ne correspond à votre recherche"
                : activeFilter === "registered"
                  ? "Vous n'êtes inscrit à aucun événement"
                  : "Aucun événement disponible"}
            </Text>
          </View>
        }
        renderItem={({ item: event }) => (
          <Pressable
            style={styles.eventCard}
            onPress={() => { if (!isScrolling.current) onEventClick(event); }}
            unstable_pressDelay={100}
          >
            {/* Image */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: event.image }} style={styles.eventImage} />

              {/* Top badges */}
              <View style={styles.badgeContainer}>
                <View style={[styles.themeBadge, { backgroundColor: getThemeColor(event.theme) }]}>
                  <Text style={styles.badgeText}>{event.theme}</Text>
                </View>
                {event.isRegistered && (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.badgeText}>✓ Inscrit</Text>
                  </View>
                )}
              </View>

              {/* Orga logo */}
              {event.orgaLogo && (
                <View style={styles.orgaLogoWrapper}>
                  <Image source={{ uri: event.orgaLogo }} style={styles.orgaLogo} />
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>

              {event.orgaName && (
                <Text style={styles.orgaName}>{event.orgaName}</Text>
              )}

              <View style={styles.infoContainer}>
                {event.hasPhysicalEvent && (
                  <>
                    <View style={styles.infoRow}>
                      <MaterialIcons name="event" size={15} color={theme.colors.placeholder} />
                      <Text style={styles.infoText}>{event.physicalDate}</Text>
                    </View>
                    {event.location ? (
                      <View style={styles.infoRow}>
                        <MaterialIcons name="place" size={15} color={theme.colors.placeholder} />
                        <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
                      </View>
                    ) : null}
                  </>
                )}

                <View style={styles.infoRow}>
                  <View style={styles.appBadge}>
                    <Text style={styles.appBadgeText}>App</Text>
                  </View>
                  <Text style={styles.infoText}>{event.appDate}</Text>
                </View>

                <View style={styles.infoRow}>
                  <MaterialIcons name="group" size={15} color={theme.colors.placeholder} />
                  <Text style={styles.infoText}>
                    {event.participants}/{event.maxParticipants} participants
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${fillPct(event)}%` as any }]} />
              </View>
            </View>

            {/* Enter button */}
            {event.isRegistered && onEnterEvent && (
              <View style={styles.actionContainer}>
                <Pressable
                  style={styles.enterButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEnterEvent(event);
                  }}
                >
                  <Text style={styles.enterButtonText}>Accéder à l'environnement</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        )}
      />

      {/* Advanced Filters Modal */}
      <Modal
        visible={isAdvancedOpen}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setIsAdvancedOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsAdvancedOpen(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <Pressable onPress={() => setIsAdvancedOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Affichage — uniquement pour les users */}
              {userType === "user" && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Affichage</Text>
                  <View style={styles.chipsContainer}>
                    <Pressable
                      style={[styles.chip, activeFilter === "all" && styles.chipActive]}
                      onPress={() => setActiveFilter("all")}
                    >
                      <Text style={[styles.chipText, activeFilter === "all" && styles.chipTextActive]}>
                        Tous les événements
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.chip, activeFilter === "registered" && styles.chipActive]}
                      onPress={() => setActiveFilter("registered")}
                    >
                      <Text style={[styles.chipText, activeFilter === "registered" && styles.chipTextActive]}>
                        Mes événements
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Theme Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Type d'événement</Text>
                <View style={styles.chipsContainer}>
                  {themes.map((themeOption) => (
                    <Pressable
                      key={themeOption.value}
                      style={[styles.chip, selectedTheme === themeOption.value && styles.chipActive]}
                      onPress={() => setSelectedTheme(themeOption.value)}
                    >
                      <Text style={[styles.chipText, selectedTheme === themeOption.value && styles.chipTextActive]}>
                        {themeOption.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Availability Filter */}
              <View style={styles.filterSection}>
                <Pressable style={styles.switchContainer} onPress={() => setOnlyAvailable(!onlyAvailable)}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.filterLabel}>Places disponibles uniquement</Text>
                    <Text style={styles.filterSubLabel}>Masquer les événements complets</Text>
                  </View>
                  <View style={[styles.switch, onlyAvailable && styles.switchActive]}>
                    <View style={[styles.switchThumb, onlyAvailable && styles.switchThumbActive]} />
                  </View>
                </Pressable>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Date</Text>
                <View style={styles.chipsContainer}>
                  {dateFilters.map((filter) => (
                    <Pressable
                      key={filter.value}
                      style={[styles.chip, dateFilter === filter.value && styles.chipActive]}
                      onPress={() => setDateFilter(filter.value)}
                    >
                      <Text style={[styles.chipText, dateFilter === filter.value && styles.chipTextActive]}>
                        {filter.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.resetButton} onPress={resetAdvancedFilters}>
                <Text style={styles.resetButtonText}>Réinitialiser</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={() => setIsAdvancedOpen(false)}>
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {userType === "organizer" && onCreateEvent && (
        <CreateEventDialog onEventCreated={onCreateEvent} />
      )}
    </View>
  );
}

const createStyles = (theme: Theme, topInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, position: "relative" },

  // Search
  searchContainer: {
    position: "absolute", top: topInset + 8, left: 16, right: 16, zIndex: 10, gap: 8,
  },
  searchRow: { flexDirection: "row", gap: 8 },
  searchWrapper: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.card, borderRadius: 24,
    paddingHorizontal: 12, shadowColor: theme.colors.shadow,
    shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  locationWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.card, borderRadius: 24,
    paddingHorizontal: 12, shadowColor: theme.colors.shadow,
    shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: theme.colors.foreground },
  filterButton: {
    width: 44, height: 44, backgroundColor: theme.colors.card,
    borderRadius: 22, justifyContent: "center", alignItems: "center",
    shadowColor: theme.colors.shadow, shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3, position: "relative",
  },
  filterDot: {
    position: "absolute", top: 8, right: 8, width: 8, height: 8,
    backgroundColor: theme.colors.primary, borderRadius: 4,
  },

  // List
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: topInset + 116, paddingHorizontal: 16, paddingBottom: 110, gap: 16 },

  // Empty
  emptyState: { paddingVertical: 64, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.foreground, fontFamily: "Poppins" },
  emptyText: { fontSize: 14, color: theme.colors.mutedForeground, textAlign: "center", paddingHorizontal: 24 },

  // Card
  eventCard: {
    backgroundColor: theme.colors.card, borderRadius: 16, overflow: "hidden",
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  imageContainer: { position: "relative", aspectRatio: 16 / 9 },
  eventImage: { width: "100%", height: "100%", resizeMode: "cover" },
  badgeContainer: {
    position: "absolute", top: 12, left: 12, right: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  themeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  registeredBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "#22c55e" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  orgaLogoWrapper: {
    position: "absolute", bottom: 10, right: 12,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: "#fff", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 3,
  },
  orgaLogo: { width: "100%", height: "100%" },

  cardContent: { padding: 14 },
  eventName: { fontFamily: "Poppins", fontWeight: "600", fontSize: 16, color: theme.colors.foreground, marginBottom: 2 },
  orgaName: { fontSize: 12, color: theme.colors.mutedForeground, marginBottom: 10 },

  infoContainer: { gap: 6, marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  appBadge: {
    backgroundColor: theme.colors.accent ?? "#dbeafe",
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  appBadgeText: { fontSize: 10, fontWeight: "700", color: theme.colors.primary },

  progressBar: {
    width: "100%", height: 6, backgroundColor: theme.colors.accent ?? "#dbeafe",
    borderRadius: 3, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 3 },

  actionContainer: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0 },
  enterButton: {
    backgroundColor: theme.colors.accentSolid, paddingVertical: 12,
    borderRadius: 10, alignItems: "center",
  },
  enterButtonText: { fontFamily: "Poppins", color: theme.colors.accentSolidText, fontSize: 15, fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: theme.colors.card, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary,
  },
  modalTitle: { fontFamily: "Poppins", fontSize: 20, fontWeight: "600", color: theme.colors.foreground },
  modalBody: { padding: 20 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 14, fontWeight: "600", color: theme.colors.foreground, marginBottom: 10 },
  filterSubLabel: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },

  chipsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background,
  },
  chipActive: { backgroundColor: theme.colors.accentSolid, borderColor: theme.colors.accentSolid },
  chipText: { fontSize: 13, color: theme.colors.foreground },
  chipTextActive: { color: theme.colors.accentSolidText, fontWeight: "600" },

  switchContainer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, backgroundColor: theme.colors.background, borderRadius: 12,
  },
  switchLabel: { flex: 1 },
  switch: { width: 51, height: 31, borderRadius: 16, backgroundColor: theme.colors.border, padding: 2 },
  switchActive: { backgroundColor: theme.colors.primary },
  switchThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: theme.colors.card },
  switchThumbActive: { alignSelf: "flex-end" },

  modalActions: {
    flexDirection: "row", gap: 12, padding: 20,
    borderTopWidth: 1, borderTopColor: theme.colors.secondary,
  },
  resetButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: "center",
  },
  resetButtonText: { fontSize: 15, fontWeight: "600", color: theme.colors.foreground },
  applyButton: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: theme.colors.accentSolid, alignItems: "center",
  },
  applyButtonText: { fontSize: 15, fontWeight: "600", color: theme.colors.accentSolidText },
});