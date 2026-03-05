// components/EventsList.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import { useTheme, shared } from "@/context/ThemeContext";
import { type Theme } from "@/constants/theme";
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
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeFilter, setActiveFilter] = useState<"all" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [keyboardOffset] = useState(new Animated.Value(0));
  const [maxDistance, setMaxDistance] = useState(50);
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Track scrolling to prevent accidental press during scroll
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
    const matchesTheme =
      selectedTheme === "all" ||
      event.theme.toLowerCase() === selectedTheme.toLowerCase();
    const matchesAvailability =
      !onlyAvailable || event.participants < event.maxParticipants;
    return matchesFilter && matchesSearch && matchesTheme && matchesAvailability;
  });

  const resetAdvancedFilters = () => {
    setMaxDistance(50);
    setSelectedTheme("all");
    setOnlyAvailable(false);
    setDateFilter("all");
  };

  const hasActiveAdvancedFilters =
    maxDistance !== 50 || selectedTheme !== "all" || onlyAvailable || dateFilter !== "all";

  const getThemeColor = (eventTheme: string) => {
    return shared.eventTheme[eventTheme.toLowerCase()] || shared.eventTheme.général;
  };

  const themes = [
    { value: "all", label: "Tous les types" },
    { value: "musique", label: "Musique" },
    { value: "professionnel", label: "Professionnel" },
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

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
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
          <MaterialIcons name="more-vert" size={20} color={theme.colors.foreground} />
          {hasActiveAdvancedFilters && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => { isScrolling.current = true; }}
        onScrollEndDrag={() => { isScrolling.current = false; }}
        onMomentumScrollEnd={() => { isScrolling.current = false; }}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Aucun événement ne correspond à votre recherche"
                : activeFilter === "registered"
                  ? "Vous n'êtes inscrit à aucun événement"
                  : "Aucun événement disponible"}
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => { if (!isScrolling.current) onEventClick(event); }}
              unstable_pressDelay={100}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: event.image }} style={styles.eventImage} />
                <View style={styles.badgeContainer}>
                  <View style={[styles.themeBadge, { backgroundColor: getThemeColor(event.theme) }]}>
                    <Text style={styles.badgeText}>{event.theme}</Text>
                  </View>
                  {event.isRegistered && (
                    <View style={styles.registeredBadge}>
                      <Text style={styles.badgeText}>Inscrit</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.eventName}>{event.name}</Text>

                {event.orgaName && (
                  <Text style={styles.orgaName}>{event.orgaName}</Text>
                )}

                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="event" size={16} color={theme.colors.foreground} />
                    <Text style={styles.infoText}>
                      {event.hasPhysicalEvent ? event.physicalDate : event.appDate}
                    </Text>
                  </View>

                  {event.location ? (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="place" size={16} color={theme.colors.foreground} />
                      <Text style={styles.infoText}>{event.location}</Text>
                    </View>
                  ) : null}

                  <View style={styles.infoRow}>
                    <MaterialIcons name="group" size={16} color={theme.colors.foreground} />
                    <Text style={styles.infoText}>
                      {event.participants}/{event.maxParticipants} participants
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min((event.participants / event.maxParticipants) * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>

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
          ))
        )}
      </ScrollView>

      {/* Filter Tabs */}
      {userType === "user" && (
        <Animated.View style={[styles.filterTabs, { bottom: Animated.add(24, keyboardOffset) }]}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeFilter === "all" && styles.tabActive]}
              onPress={() => setActiveFilter("all")}
            >
              <Text style={[styles.tabText, activeFilter === "all" && styles.tabTextActive]}>
                Tous les événements
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeFilter === "registered" && styles.tabActive]}
              onPress={() => setActiveFilter("registered")}
            >
              <Text style={[styles.tabText, activeFilter === "registered" && styles.tabTextActive]}>
                Mes événements
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Advanced Filters Modal */}
      <Modal
        visible={isAdvancedOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAdvancedOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recherche avancée</Text>
              <Pressable onPress={() => setIsAdvancedOpen(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Distance Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Distance maximale : {maxDistance} km</Text>
                <View style={styles.distanceButtons}>
                  {[10, 25, 50, 100].map((distance) => (
                    <Pressable
                      key={distance}
                      style={[styles.distanceButton, maxDistance === distance && styles.distanceButtonActive]}
                      onPress={() => setMaxDistance(distance)}
                    >
                      <Text style={[styles.distanceButtonText, maxDistance === distance && styles.distanceButtonTextActive]}>
                        {distance} km
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Theme Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Type d'événement</Text>
                <View style={styles.optionsContainer}>
                  {themes.map((themeOption) => (
                    <Pressable
                      key={themeOption.value}
                      style={[styles.optionButton, selectedTheme === themeOption.value && styles.optionButtonActive]}
                      onPress={() => setSelectedTheme(themeOption.value)}
                    >
                      <Text style={[styles.optionButtonText, selectedTheme === themeOption.value && styles.optionButtonTextActive]}>
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
                <View style={styles.optionsContainer}>
                  {dateFilters.map((filter) => (
                    <Pressable
                      key={filter.value}
                      style={[styles.optionButton, dateFilter === filter.value && styles.optionButtonActive]}
                      onPress={() => setDateFilter(filter.value)}
                    >
                      <Text style={[styles.optionButtonText, dateFilter === filter.value && styles.optionButtonTextActive]}>
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
          </View>
        </View>
      </Modal>

      {userType === "organizer" && onCreateEvent && (
        <CreateEventDialog onEventCreated={onCreateEvent} />
      )}
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, position: "relative" },
  searchContainer: {
    position: "absolute", top: 16, left: 16, right: 16,
    flexDirection: "row", gap: 8, zIndex: 10,
  },
  searchWrapper: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.card, borderRadius: 24,
    paddingHorizontal: 12, shadowColor: theme.colors.shadow, shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: theme.colors.foreground },
  filterButton: {
    width: 48, height: 48, backgroundColor: theme.colors.card,
    borderRadius: 24, justifyContent: "center", alignItems: "center",
    shadowColor: theme.colors.shadow, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6, elevation: 3, position: "relative",
  },
  filterDot: {
    position: "absolute", top: 8, right: 8, width: 8, height: 8,
    backgroundColor: theme.colors.primary, borderRadius: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 80, padding: 16, paddingBottom: 100, gap: 16 },
  emptyState: { paddingVertical: 48, alignItems: "center" },
  emptyText: { fontSize: 16, color: theme.colors.mutedForeground, textAlign: "center" },
  eventCard: {
    backgroundColor: theme.colors.card, borderRadius: 12, overflow: "hidden",
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 16,
  },
  imageContainer: { position: "relative", height: 192 },
  eventImage: { width: "100%", height: "100%" },
  badgeContainer: {
    position: "absolute", top: 12, left: 12, right: 12,
    flexDirection: "row", justifyContent: "space-between",
  },
  themeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  registeredBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: shared.success },
  badgeText: { color: theme.colors.primaryForeground, fontSize: 12, fontWeight: "600" },
  cardContent: { padding: 16 },
  eventName: { fontFamily: "Poppins", fontWeight: "600", fontSize: 18, color: theme.colors.foreground, marginBottom: 4 },
  orgaName: { fontSize: 13, color: theme.colors.mutedForeground, marginBottom: 10 },
  infoContainer: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 14, color: theme.colors.textSecondary, flex: 1 },
  progressBar: {
    width: "100%", height: 8, backgroundColor: theme.colors.accent,
    borderRadius: 4, marginTop: 12, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary, borderRadius: 4 },
  actionContainer: { padding: 16, paddingTop: 0 },
  enterButton: { backgroundColor: theme.colors.accentSolid, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  enterButtonText: { fontFamily: "Poppins", color: theme.colors.accentSolidText, fontSize: 16, fontWeight: "600" },
  filterTabs: { position: "absolute", left: 16, right: 16, zIndex: 10 },
  tabsContainer: {
    flexDirection: "row", backgroundColor: theme.colors.card,
    borderRadius: 50, padding: 4, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 50, alignItems: "center" },
  tabActive: { backgroundColor: theme.colors.tabActive },
  tabText: { fontFamily: "Poppins", fontSize: 14, color: theme.colors.foreground },
  tabTextActive: { color: theme.colors.primaryForeground },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary,
  },
  modalTitle: { fontFamily: "Poppins", fontSize: 20, fontWeight: "600", color: theme.colors.foreground },
  modalBody: { padding: 20 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.foreground, marginBottom: 12 },
  filterSubLabel: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  distanceButtons: { flexDirection: "row", gap: 8 },
  distanceButton: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  distanceButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  distanceButtonText: { fontSize: 14, color: theme.colors.foreground },
  distanceButtonTextActive: { color: theme.colors.primaryForeground },
  optionsContainer: { gap: 8 },
  optionButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  optionButtonActive: { backgroundColor: theme.colors.accentSolid, borderColor: theme.colors.accentSolid },
  optionButtonText: { fontSize: 16, color: theme.colors.foreground },
  optionButtonTextActive: { color: theme.colors.accentSolidText },
  switchContainer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, backgroundColor: theme.colors.background, borderRadius: 8,
  },
  switchLabel: { flex: 1 },
  switch: { width: 51, height: 31, borderRadius: 16, backgroundColor: theme.colors.border, padding: 2, justifyContent: "center" },
  switchActive: { backgroundColor: theme.colors.primary },
  switchThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: theme.colors.card },
  switchThumbActive: { alignSelf: "flex-end" },
  modalActions: { flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: theme.colors.secondary },
  resetButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  resetButtonText: { fontSize: 16, fontWeight: "600", color: theme.colors.foreground },
  applyButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.accentSolid, alignItems: "center" },
  applyButtonText: { fontSize: 16, fontWeight: "600", color: theme.colors.accentSolidText },
});
