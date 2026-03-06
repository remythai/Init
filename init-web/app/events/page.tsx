"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Search, MapPin, Calendar, Users, Filter, X, Plus, Trash2, Edit2, User, Map, LayoutGrid } from "lucide-react";
import { authService } from "../services/auth.service";
import {
  eventService,
  transformEventResponses,
  Event,
  CustomField,
  getFieldId,
} from "../services/event.service";
import BottomNavigation from "../components/BottomNavigation";
import DesktopNav from "../components/DesktopNav";
import ThemeToggle from "../components/ThemeToggle";
import FiltersSidebar from "./components/FiltersSidebar";

const EventsMap = dynamic(
  () => import("./components/EventsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-card rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted text-sm">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<"user" | "orga" | null>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState<"all" | "registered">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Create Event Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    // Physical event dates (optional)
    has_physical_event: false,
    start_at: "",
    end_at: "",
    location: "",
    // App availability dates (required)
    app_start_at: "",
    app_end_at: "",
    max_participants: "",
    is_public: true,
    has_whitelist: false,
    has_link_access: true,
    has_password_access: false,
    access_password: "",
    cooldown: "",
    theme: "Professionnel",
  });

  // Custom Fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [currentField, setCurrentField] = useState<CustomField>({
    type: "text",
    label: "",
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState("");

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Date filter
  const [dateFilter, setDateFilter] = useState<string>("all");

  // View mode & location search
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [locationQuery, setLocationQuery] = useState("");
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeCache = useRef<globalThis.Map<string, { lat: number; lng: number } | null>>(new globalThis.Map());

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  interface AddressSuggestion {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      road?: string;
      house_number?: string;
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
    };
  }

  const fieldTypes: { value: CustomField['type']; label: string }[] = [
    { value: "text", label: "Texte court" },
    { value: "textarea", label: "Texte long" },
    { value: "number", label: "Nombre" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telephone" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Case a cocher" },
    { value: "select", label: "Menu deroulant" },
    { value: "radio", label: "Choix unique" },
    { value: "multiselect", label: "Choix multiples" },
  ];

  const needsOptions = ["select", "radio", "multiselect"].includes(currentField.type);

  useEffect(() => {
    checkAuthAndLoadEvents();
  }, []);

  // Address search effect
  useEffect(() => {
    if (formData.location.length > 2) {
      const timer = setTimeout(() => {
        searchAddress(formData.location);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.location]);

  const searchAddress = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      // Use local API proxy to avoid CORS issues with Nominatim
      const url = `/api/geocode?q=${encodeURIComponent(query)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        setAddressSuggestions(data);
        setShowSuggestions(data.length > 0);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Erreur recherche adresse:", error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    let shortAddress = "";

    if (suggestion.address) {
      const addr = suggestion.address;
      const street =
        addr.house_number && addr.road
          ? `${addr.house_number} ${addr.road}`
          : addr.road || "";
      const postcode = addr.postcode || "";
      const city =
        addr.city || addr.town || addr.village || addr.municipality || "";

      if (street && postcode && city) {
        shortAddress = `${street}, ${postcode} ${city}`;
      } else if (street && city) {
        shortAddress = `${street}, ${city}`;
      } else if (postcode && city) {
        shortAddress = `${postcode} ${city}`;
      } else {
        const parts = suggestion.display_name.split(", ");
        shortAddress = parts.slice(0, 3).join(", ");
      }
    } else {
      const parts = suggestion.display_name.split(", ");
      shortAddress = parts.slice(0, 3).join(", ");
    }

    setFormData({ ...formData, location: shortAddress });
    setShowSuggestions(false);
  };

  // Custom fields handlers
  const handleAddOption = () => {
    if (!newOption.trim()) {
      return;
    }

    setCurrentField({
      ...currentField,
      options: [...(currentField.options || []), newOption.trim()],
    });
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions =
      currentField.options?.filter((_, i) => i !== index) || [];
    setCurrentField({ ...currentField, options: updatedOptions });
  };

  const handleSaveCustomField = () => {
    if (!currentField.label.trim()) {
      return;
    }

    if (needsOptions && (!currentField.options || currentField.options.length === 0)) {
      return;
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...customFields];
      updatedFields[editingFieldIndex] = currentField;
      setCustomFields(updatedFields);
    } else {
      // Vérifier si un champ avec le même label existe déjà
      const newFieldId = getFieldId(currentField.label);
      if (customFields.some((f) => getFieldId(f.label) === newFieldId)) {
        return;
      }
      setCustomFields([...customFields, currentField]);
    }

    setCurrentField({
      type: "text",
      label: "",
      required: false,
      options: [],
    });
    setShowCustomFieldForm(false);
    setEditingFieldIndex(null);
  };

  const handleEditCustomField = (index: number) => {
    setCurrentField({ ...customFields[index] });
    setEditingFieldIndex(index);
    setShowCustomFieldForm(true);
  };

  const handleDeleteCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const checkAuthAndLoadEvents = async () => {
    const validatedType = await authService.validateAndGetUserType();

    if (!validatedType) {
      router.push("/auth");
      return;
    }

    setUserType(validatedType);
    await loadEvents(validatedType);
  };

  const loadEvents = async (type: "user" | "orga" | null) => {
    setLoading(true);
    setError("");

    try {
      if (type === "orga") {
        const orgaEvents = await eventService.getMyOrgaEvents();
        setEvents(transformEventResponses(orgaEvents));
      } else {
        const response = await eventService.getPublicEvents({
          upcoming: true,
          limit: 50,
        });
        setEvents(transformEventResponses(response.events || []));
      }
    } catch (err: unknown) {
      console.error("Failed to load events:", err);
      setError("Impossible de charger les événements.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push("/");
  };

  const handleCreateEvent = async () => {
    setCreateError("");

    // Validation
    if (!formData.name.trim()) {
      setCreateError("Le nom de l'evenement est requis");
      return;
    }
    if (!formData.description.trim()) {
      setCreateError("La description est requise");
      return;
    }
    // App availability dates are required
    if (!formData.app_start_at) {
      setCreateError("La date de debut de disponibilite de l'app est requise");
      return;
    }
    if (!formData.app_end_at) {
      setCreateError("La date de fin de disponibilite de l'app est requise");
      return;
    }

    const appStartDate = new Date(formData.app_start_at);
    const appEndDate = new Date(formData.app_end_at);

    if (appEndDate <= appStartDate) {
      setCreateError("La date de fin de l'app doit etre apres la date de debut");
      return;
    }

    // Physical event dates (optional)
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (formData.has_physical_event) {
      if (!formData.location.trim()) {
        setCreateError("Le lieu est requis pour un evenement physique");
        return;
      }
      if (!formData.start_at) {
        setCreateError("La date de debut de l'evenement physique est requise");
        return;
      }
      if (!formData.end_at) {
        setCreateError("La date de fin de l'evenement physique est requise");
        return;
      }

      startDate = new Date(formData.start_at);
      endDate = new Date(formData.end_at);

      if (endDate <= startDate) {
        setCreateError("La date de fin de l'evenement physique doit etre apres la date de debut");
        return;
      }
    }

    const maxParticipants = parseInt(formData.max_participants);
    if (!formData.max_participants || isNaN(maxParticipants) || maxParticipants < 1) {
      setCreateError("Le nombre de participants doit etre superieur a 0");
      return;
    }

    if (formData.has_password_access && !formData.access_password.trim()) {
      setCreateError("Un mot de passe est requis quand l'acces par mot de passe est active");
      return;
    }

    if (formData.cooldown && isNaN(parseInt(formData.cooldown))) {
      setCreateError("Le cooldown doit etre un nombre");
      return;
    }

    setCreating(true);

    try {
      const eventData: Parameters<typeof eventService.createEvent>[0] = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.has_physical_event ? formData.location.trim() : undefined,
        max_participants: maxParticipants,
        is_public: formData.is_public,
        has_whitelist: formData.has_whitelist,
        has_link_access: formData.has_link_access,
        has_password_access: formData.has_password_access,
        custom_fields: customFields.length > 0 ? customFields : undefined,
        // App availability dates (required)
        app_start_at: appStartDate.toISOString(),
        app_end_at: appEndDate.toISOString(),
        // Theme
        theme: formData.theme,
      };

      // Physical event dates (optional)
      if (formData.has_physical_event && startDate && endDate) {
        eventData.start_at = startDate.toISOString();
        eventData.end_at = endDate.toISOString();
      }

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      await eventService.createEvent(eventData);

      // Reset form
      setFormData({
        name: "",
        description: "",
        has_physical_event: false,
        start_at: "",
        end_at: "",
        location: "",
        app_start_at: "",
        app_end_at: "",
        max_participants: "",
        is_public: true,
        has_whitelist: false,
        has_link_access: true,
        has_password_access: false,
        access_password: "",
        cooldown: "",
        theme: "Professionnel",
      });
      setCustomFields([]);

      setIsCreateOpen(false);
      setSuccessMessage("Evenement cree avec succes !");
      setTimeout(() => setSuccessMessage(""), 3000);
      await loadEvents(userType);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la creation";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      musique: "bg-purple-500",
      professionnel: "bg-blue-500",
      étudiant: "bg-green-500",
      sport: "bg-orange-500",
      café: "bg-amber-500",
      fête: "bg-pink-500",
      général: "bg-gray-500",
    };
    return colors[theme.toLowerCase()] || "bg-gray-500";
  };

  const themes = [
    { value: "all", label: "Tous" },
    { value: "musique", label: "Musique" },
    { value: "professionnel", label: "Pro" },
    { value: "étudiant", label: "Etudiant" },
    { value: "sport", label: "Sport" },
    { value: "café", label: "Cafe" },
    { value: "fête", label: "Fete" },
  ];

  const dateFilters = [
    { value: "all", label: "Toutes les dates" },
    { value: "today", label: "Aujourd'hui" },
    { value: "week", label: "Cette semaine" },
    { value: "month", label: "Ce mois-ci" },
  ];

  const themeOptions = [
    "Professionnel",
    "Musique",
    "Sport",
    "Café",
    "Étudiant",
    "Fête",
  ];

  const filteredEvents = events.filter((event) => {
    const matchesFilter = activeFilter === "all" ? true : event.isRegistered;
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.theme.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationQuery ||
      (event.location?.toLowerCase().includes(locationQuery.toLowerCase()) ?? false);
    const matchesTheme =
      selectedTheme === "all" ||
      event.theme.toLowerCase() === selectedTheme.toLowerCase();
    const matchesAvailability =
      !onlyAvailable || event.participants < event.maxParticipants;

    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate =
        event.appDate.toLowerCase().includes("aujourd'hui") ||
        event.appDate.toLowerCase().includes("aujourd");
    }

    return matchesFilter && matchesSearch && matchesLocation && matchesTheme && matchesAvailability && matchesDate;
  });

  const hasActiveFilters = selectedTheme !== "all" || onlyAvailable || dateFilter !== "all";

  // Geocoding for map view
  const geocodeEvents = useCallback(async (eventsToGeocode: Event[]) => {
    const uniqueLocations = [...new Set(
      eventsToGeocode
        .map(e => e.location)
        .filter((loc): loc is string => !!loc && loc.trim() !== "" && !geocodeCache.current.has(loc))
    )];

    if (uniqueLocations.length === 0) {
      const result: Record<string, { lat: number; lng: number } | null> = {};
      geocodeCache.current.forEach((value, key) => { result[key] = value; });
      setGeocodedLocations(result);
      return;
    }

    setIsGeocoding(true);

    for (const location of uniqueLocations) {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          geocodeCache.current.set(location, {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
        } else {
          geocodeCache.current.set(location, null);
        }
      } catch {
        geocodeCache.current.set(location, null);
      }
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    const result: Record<string, { lat: number; lng: number } | null> = {};
    geocodeCache.current.forEach((value, key) => { result[key] = value; });
    setGeocodedLocations(result);
    setIsGeocoding(false);
  }, []);

  useEffect(() => {
    if (viewMode === "map") {
      geocodeEvents(filteredEvents);
    }
  }, [viewMode, filteredEvents, geocodeEvents]);

  const mapEvents = filteredEvents
    .filter(e => e.location && geocodedLocations[e.location])
    .map(e => ({
      id: e.id,
      name: e.name,
      location: e.location!,
      lat: geocodedLocations[e.location!]!.lat,
      lng: geocodedLocations[e.location!]!.lng,
      theme: e.theme,
      participants: e.participants,
      maxParticipants: e.maxParticipants,
    }));

  const eventsByTheme = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    for (const event of filteredEvents) {
      const theme = event.theme || "général";
      if (!grouped[theme]) grouped[theme] = [];
      grouped[theme].push(event);
    }
    return Object.entries(grouped);
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-page flex flex-col overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-page pointer-events-none" />
        <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
          <Link href="/">
            <Image src="/LogoPng.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto dark:hidden" />
            <Image src="/logo.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto hidden dark:block" />
          </Link>
          <DesktopNav />
          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="font-poppins text-sm text-secondary hover:text-primary transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-24 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg text-center max-w-md mx-auto">
          {successMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="pt-14 md:pt-16 pb-32 flex-1 overflow-y-auto">
        <div className="mx-auto px-4 md:px-10 lg:px-16">
          <div className="py-6 md:py-8" />

          {/* Search Bars + View Toggle */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Rechercher un evenement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-primary placeholder-muted"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Lieu..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-primary placeholder-muted"
                />
              </div>
            </div>
            <div className="flex gap-3 self-start">
              <button
                onClick={() => setViewMode(v => v === "grid" ? "map" : "grid")}
                className="w-12 h-12 bg-card rounded-full shadow-sm flex items-center justify-center hover:bg-hover transition-colors flex-shrink-0"
                title={viewMode === "grid" ? "Vue carte" : "Vue grille"}
              >
                {viewMode === "grid" ? (
                  <Map className="w-5 h-5 text-primary" />
                ) : (
                  <LayoutGrid className="w-5 h-5 text-primary" />
                )}
              </button>
              <button
                onClick={() => setIsAdvancedOpen(true)}
                className="w-12 h-12 bg-card rounded-full shadow-sm flex items-center justify-center hover:bg-hover transition-colors relative flex-shrink-0 min-[1500px]:hidden"
              >
                <Filter className="w-5 h-5 text-primary" />
                {hasActiveFilters && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#1271FF] rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* Filters Bar — only visible above 1500px */}
          <div className="hidden min-[1500px]:block mb-6">
            <FiltersSidebar
              selectedTheme={selectedTheme}
              setSelectedTheme={setSelectedTheme}
              themes={themes}
              onlyAvailable={onlyAvailable}
              setOnlyAvailable={setOnlyAvailable}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              dateFilters={dateFilters}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              userType={userType}
              onReset={() => {
                setSelectedTheme("all");
                setOnlyAvailable(false);
                setDateFilter("all");
                setActiveFilter("all");
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Content Area */}
          <div>
              {viewMode === "map" ? (
                <div className="h-[600px] rounded-xl overflow-hidden relative">
                  {isGeocoding && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-sm rounded-full shadow-sm px-4 py-2 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#1271FF]/30 border-t-[#1271FF] rounded-full animate-spin"></div>
                      <span className="text-sm text-secondary">Geolocalisation des evenements...</span>
                    </div>
                  )}
                  <EventsMap
                    events={mapEvents}
                    onEventClick={(id) => router.push(`/events/${id}`)}
                  />
                  {filteredEvents.filter(e => !e.location).length > 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-sm rounded-full shadow-sm px-4 py-2">
                      <span className="text-xs text-secondary">
                        {filteredEvents.filter(e => !e.location).length} evenement(s) sans lieu non affiche(s)
                      </span>
                    </div>
                  )}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-secondary text-lg">
                    {searchQuery || locationQuery
                      ? "Aucun evenement ne correspond a votre recherche"
                      : activeFilter === "registered"
                      ? "Vous n'etes inscrit a aucun evenement"
                      : userType === "orga"
                      ? "Vous n'avez pas encore cree d'evenement"
                      : "Aucun evenement disponible"}
                  </p>
                  {userType === "orga" && (
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="mt-4 bg-[#1271FF] hover:bg-[#0d5dd8] text-white px-6 py-3 rounded-full font-medium transition-colors"
                    >
                      Creer mon premier evenement
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile: Horizontal lists by category */}
                  <div className="md:hidden space-y-6">
                    {eventsByTheme.map(([theme, themeEvents]) => (
                      <div key={theme}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`${getThemeColor(theme)} w-3 h-3 rounded-full`} />
                          <h2 className="font-poppins font-semibold text-lg text-primary capitalize">
                            {theme}
                          </h2>
                          <span className="text-sm text-muted">({themeEvents.length})</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                          {themeEvents.map((event) => (
                            <div
                              key={event.id}
                              className="bg-card rounded-xl overflow-hidden shadow-sm cursor-pointer relative flex-shrink-0 w-[280px] snap-start flex flex-col active:scale-[0.98] transition-transform"
                              onClick={() => router.push(`/events/${event.id}`)}
                            >
                              <div className="relative h-36">
                                <img
                                  src={event.image}
                                  alt={event.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2 right-2 flex justify-between">
                                  {event.isRegistered && (
                                    <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-md ml-auto">
                                      Inscrit
                                    </span>
                                  )}
                                </div>
                                {event.orgaLogo && (
                                  <div className="absolute bottom-2 right-2">
                                    <img
                                      src={event.orgaLogo}
                                      alt={event.orgaName || 'Organisateur'}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex-1 pb-14">
                                <h3 className="font-poppins font-semibold text-sm text-primary mb-2 line-clamp-1">
                                  {event.name}
                                </h3>
                                <div className="space-y-1">
                                  {event.hasPhysicalEvent && (
                                    <div className="flex items-center gap-1.5 text-secondary">
                                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="text-xs line-clamp-1">{event.location || 'Lieu a confirmer'}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 text-secondary">
                                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="text-xs">
                                      {event.participants}/{event.maxParticipants}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#1271FF] rounded-full transition-all"
                                      style={{
                                        width: `${(event.participants / event.maxParticipants) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                {event.isRegistered && (
                                  <Link
                                    href={`/events/${event.id}/environment/swiper`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-3 left-3 right-3 bg-accent-solid hover:bg-accent-solid/80 text-accent-solid-text py-2 rounded-lg font-medium transition-colors text-center text-sm"
                                  >
                                    Accéder
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Grid layout grouped by category */}
                  <div className="hidden md:block space-y-8">
                    {eventsByTheme.map(([theme, themeEvents]) => (
                      <div key={theme}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`${getThemeColor(theme)} w-3 h-3 rounded-full`} />
                          <h2 className="font-poppins font-semibold text-xl text-primary capitalize">
                            {theme}
                          </h2>
                          <span className="text-sm text-muted">({themeEvents.length})</span>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {themeEvents.map((event) => (
                            <div
                              key={event.id}
                              className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer relative h-full flex flex-col hover:scale-[1.01]"
                              onClick={() => router.push(`/events/${event.id}`)}
                            >
                              <div className="relative h-48">
                                <img
                                  src={event.image}
                                  alt={event.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-3 left-3 right-3 flex justify-between">
                                  {event.isRegistered && (
                                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md ml-auto">
                                      Inscrit
                                    </span>
                                  )}
                                </div>
                                {event.orgaLogo && (
                                  <div className="absolute bottom-3 right-3">
                                    <img
                                      src={event.orgaLogo}
                                      alt={event.orgaName || 'Organisateur'}
                                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="p-4 flex-1 pb-20">
                                <h3 className="font-poppins font-semibold text-lg text-primary mb-3">
                                  {event.name}
                                </h3>
                                <div className="space-y-2">
                                  {event.hasPhysicalEvent && (
                                    <>
                                      <div className="flex items-center gap-2 text-secondary">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm">{event.physicalDate}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-secondary">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">{event.location || 'Lieu a confirmer'}</span>
                                      </div>
                                    </>
                                  )}
                                  <div className="flex items-center gap-2 text-secondary">
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">App</span>
                                    <span className="text-sm">{event.appDate}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-secondary">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm">
                                      {event.participants}/{event.maxParticipants} participants
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#1271FF] rounded-full transition-all"
                                      style={{
                                        width: `${(event.participants / event.maxParticipants) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                {event.isRegistered && (
                                  <Link
                                    href={`/events/${event.id}/environment/swiper`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-4 left-4 right-4 bg-accent-solid hover:bg-accent-solid/80 text-accent-solid-text py-3 rounded-lg font-medium transition-colors text-center"
                                  >
                                    Acceéer a l'environnement
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </div>
        </div>
      </main>


      {/* Floating Action Button (for organizers) - Like mobile CreateEventDialog */}
      {userType === "orga" && (
        <button
          onClick={() => setIsCreateOpen(true)}
          className="fixed bottom-8 right-6 w-16 h-16 bg-[#1271FF] hover:bg-[#0d5dd8] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Advanced Filters Modal */}
      {isAdvancedOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setIsAdvancedOpen(false)}
          />
          <div className="relative bg-modal w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-poppins text-xl font-semibold text-primary">
                Filtres
              </h2>
              <button
                onClick={() => setIsAdvancedOpen(false)}
                className="p-2 hover:bg-hover rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 space-y-6 overflow-y-auto">
              {/* All / Registered toggle */}
              {userType === "user" && (
                <div>
                  <label className="block text-sm font-semibold text-primary mb-3">
                    Affichage
                  </label>
                  <div className="inline-flex bg-badge rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveFilter("all")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeFilter === "all"
                          ? "bg-accent-solid text-accent-solid-text shadow-sm"
                          : "text-primary hover:bg-hover"
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setActiveFilter("registered")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeFilter === "registered"
                          ? "bg-accent-solid text-accent-solid-text shadow-sm"
                          : "text-primary hover:bg-hover"
                      }`}
                    >
                      Mes events
                    </button>
                  </div>
                </div>
              )}

              {/* Theme Filter */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-3">
                  Type d'événement
                </label>
                <div className="flex flex-wrap gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setSelectedTheme(theme.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTheme === theme.value
                          ? "bg-accent-solid text-accent-solid-text"
                          : "bg-badge text-primary hover:bg-hover"
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <button
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-primary">
                      Places disponibles uniquement
                    </p>
                    <p className="text-sm text-secondary">
                      Masquer les evenements complets
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      onlyAvailable ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        onlyAvailable ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-3">
                  Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {dateFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        dateFilter === filter.value
                          ? "bg-accent-solid text-accent-solid-text"
                          : "bg-badge text-primary hover:bg-hover"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex-shrink-0 flex gap-3 p-5 border-t border-border">
              <button
                onClick={() => {
                  setSelectedTheme("all");
                  setOnlyAvailable(false);
                  setDateFilter("all");
                  setActiveFilter("all");
                }}
                className="flex-1 py-3 rounded-lg border border-border text-primary font-medium hover:bg-hover transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setIsAdvancedOpen(false)}
                className="flex-1 py-3 rounded-lg bg-accent-solid text-accent-solid-text font-medium hover:bg-accent-solid/80 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => !creating && setIsCreateOpen(false)}
          />
          <div className="relative bg-modal w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-poppins text-xl font-semibold text-primary">
                Créer un événement
              </h2>
              <button
                onClick={() => !creating && setIsCreateOpen(false)}
                disabled={creating}
                className="p-2 hover:bg-hover rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Error */}
              {createError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                  placeholder="Ex: Soirée Networking"
                  maxLength={100}
                  disabled={creating}
                  className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                />
                <p className={`text-xs mt-1 text-right ${formData.name.length >= 90 ? 'text-orange-500' : 'text-muted'}`}>
                  {formData.name.length}/100
                </p>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Thème
                </label>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme })}
                      disabled={creating}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.theme === theme
                          ? "bg-accent-solid text-accent-solid-text"
                          : "bg-badge text-primary hover:bg-hover"
                      } disabled:opacity-50`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 1000) })}
                  placeholder="Decrivez votre evenement..."
                  rows={3}
                  maxLength={1000}
                  disabled={creating}
                  className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none disabled:bg-badge break-words hyphens-auto"
                  style={{ wordBreak: 'break-word' }}
                />
                <p className={`text-xs mt-1 text-right ${formData.description.length >= 900 ? 'text-orange-500' : 'text-muted'}`}>
                  {formData.description.length}/1000
                </p>
              </div>

              {/* Banner Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Image de banniere :</span> Vous pourrez ajouter une image de banniere personnalisee apres la creation de l'evenement, en cliquant sur "Modifier" dans la page de l'evenement.
                </p>
              </div>

              {/* App Availability Dates (Required) */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="font-semibold text-primary">
                  Disponibilite de l'app *
                </h3>
                <p className="text-sm text-secondary">
                  Periode pendant laquelle les utilisateurs peuvent accéder au swiper, matcher et discuter.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Debut de disponibilite *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.app_start_at}
                      onChange={(e) => setFormData({ ...formData, app_start_at: e.target.value })}
                      disabled={creating}
                      className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Fin de disponibilite *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.app_end_at}
                      onChange={(e) => setFormData({ ...formData, app_end_at: e.target.value })}
                      disabled={creating}
                      className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Event Toggle */}
              <div className="space-y-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_physical_event: !formData.has_physical_event })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-primary">Evenement physique</p>
                    <p className="text-sm text-secondary">
                      {formData.has_physical_event ? "L'evenement a un lieu et une date" : "Pas de lieu ni de date physique"}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_physical_event ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.has_physical_event ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                {/* Physical Event Dates and Location */}
                {formData.has_physical_event && (
                  <div className="space-y-4 p-4 bg-badge rounded-xl">
                    <p className="text-sm text-secondary">
                      Quand et ou se deroule l'evenement physique.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Debut de l'evenement *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.start_at}
                          onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                          disabled={creating}
                          className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          Fin de l'evenement *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end_at}
                          onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                          disabled={creating}
                          className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge bg-card"
                        />
                      </div>
                    </div>

                    {/* Location inside physical event section */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-primary mb-2">
                        Lieu *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          onFocus={() => {
                            if (addressSuggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          placeholder="Commencez a taper une adresse..."
                          disabled={creating}
                          className="w-full pl-12 pr-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge bg-card"
                        />
                        {loadingSuggestions && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>

                      {/* Address Suggestions */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onClick={() => selectAddress(suggestion)}
                              className="w-full px-4 py-3 text-left hover:bg-hover flex items-start gap-3 border-b border-border last:border-0"
                            >
                              <MapPin className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-primary line-clamp-2">
                                {suggestion.display_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>


              {/* Max Participants */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Nombre maximum de participants *
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="Ex: 50"
                  min="1"
                  disabled={creating}
                  className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                />
              </div>

              {/* Access Settings */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="font-semibold text-primary">Parametres d'acces</h3>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-primary">Evenement public</p>
                    <p className="text-sm text-secondary">Visible par tous les utilisateurs</p>
                    <p className={`text-xs font-semibold mt-1 ${formData.is_public ? "text-green-600" : "text-red-500"}`}>
                      {formData.is_public ? "✓ PUBLIC - Visible dans la liste" : "✗ PRIVE - Non visible"}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.is_public ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.is_public ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_whitelist: !formData.has_whitelist })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-primary">Liste blanche</p>
                    <p className="text-sm text-secondary">Restreindre l'acces a certaines personnes</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_whitelist ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.has_whitelist ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_link_access: !formData.has_link_access })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-primary">Acces par lien</p>
                    <p className="text-sm text-secondary">Autoriser l'inscription via un lien</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_link_access ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.has_link_access ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_password_access: !formData.has_password_access })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-badge rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-primary">Acces par mot de passe</p>
                    <p className="text-sm text-secondary">Proteger l'evenement par mot de passe</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_password_access ? "bg-[#1271FF]" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.has_password_access ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>

                {formData.has_password_access && (
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      Mot de passe d'acces *
                    </label>
                    <input
                      type="password"
                      value={formData.access_password}
                      onChange={(e) => setFormData({ ...formData, access_password: e.target.value })}
                      placeholder="Entrez un mot de passe"
                      disabled={creating}
                      className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                    />
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-primary">Champs personnalises</h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomFieldForm(true)}
                    disabled={creating}
                    className="flex items-center gap-1 text-[#1271FF] hover:text-[#0d5dd8] text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2">
                    {customFields.map((field, index) => (
                      <div
                        key={getFieldId(field.label)}
                        className="flex items-center justify-between p-3 bg-badge rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-primary">{field.label}</p>
                          <p className="text-xs text-secondary">
                            {fieldTypes.find((t) => t.value === field.type)?.label} {field.required && "- Requis"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCustomField(index)}
                            className="p-1 text-secondary hover:text-[#1271FF]"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(index)}
                            className="p-1 text-secondary hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {customFields.length === 0 && (
                  <p className="text-sm text-muted italic">
                    Ajoutez des champs pour collecter des informations supplementaires
                  </p>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="space-y-3 pt-4 border-t border-border">
                <h3 className="font-semibold text-primary">Parametres avances</h3>

                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    Cooldown (en heures)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldown}
                    onChange={(e) => setFormData({ ...formData, cooldown: e.target.value })}
                    placeholder="Ex: 24"
                    min="0"
                    disabled={creating}
                    className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                  <p className="text-xs text-secondary mt-1">
                    Delai avant de pouvoir s'inscrire a nouveau
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t border-border">
              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="flex-1 py-3 rounded-xl border border-border text-primary font-medium hover:bg-hover transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-accent-solid text-accent-solid-text font-medium hover:bg-accent-solid/80 transition-colors disabled:opacity-50"
              >
                {creating ? "Creation..." : "Creer l'evenement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Field Modal */}
      {showCustomFieldForm && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => {
              setShowCustomFieldForm(false);
              setEditingFieldIndex(null);
              setCurrentField({
                type: "text",
                label: "",
                required: false,
                options: [],
              });
            }}
          />
          <div className="relative bg-modal w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-poppins text-xl font-semibold text-primary">
                {editingFieldIndex !== null ? "Modifier" : "Ajouter"} un champ
              </h2>
              <button
                onClick={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({
                    type: "text",
                    label: "",
                    required: false,
                    options: [],
                  });
                }}
                className="p-2 hover:bg-hover rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Field Label (Question) */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Question *
                </label>
                <input
                  type="text"
                  value={currentField.label}
                  onChange={(e) =>
                    setCurrentField({ ...currentField, label: e.target.value })
                  }
                  placeholder="Ex: Quel est votre profil LinkedIn ?"
                  className="w-full px-4 py-3 border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                />
                <p className="text-xs text-secondary mt-1">Cette question sera affichee aux participants</p>
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Type de champ *
                </label>
                <div className="flex flex-wrap gap-2">
                  {fieldTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setCurrentField({ ...currentField, type: type.value })
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentField.type === type.value
                          ? "bg-[#1271FF] text-white"
                          : "bg-badge text-primary hover:bg-hover"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Toggle */}
              <button
                type="button"
                onClick={() =>
                  setCurrentField({ ...currentField, required: !currentField.required })
                }
                className="w-full flex items-center justify-between p-4 bg-badge rounded-xl"
              >
                <div className="text-left">
                  <p className="font-medium text-primary">Champ requis</p>
                  <p className="text-sm text-secondary">Obligatoire lors de l'inscription</p>
                </div>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    currentField.required ? "bg-[#1271FF]" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      currentField.required ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              {/* Options for select/radio/multiselect */}
              {needsOptions && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <label className="block text-sm font-semibold text-primary">
                    Choix possibles *
                  </label>

                  {currentField.options && currentField.options.length > 0 && (
                    <div className="space-y-2">
                      {currentField.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-badge rounded-lg"
                        >
                          <p className="font-medium text-primary">{option}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="p-1 text-red-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                      placeholder="Ajouter un choix..."
                      className="flex-1 px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-2 bg-[#1271FF] text-white rounded-lg hover:bg-[#0d5dd8]"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t border-border">
              <button
                onClick={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({
                    type: "text",
                    label: "",
                    required: false,
                    options: [],
                  });
                }}
                className="flex-1 py-3 rounded-xl border border-border text-primary font-medium hover:bg-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCustomField}
                className="flex-1 py-3 rounded-xl bg-accent-solid text-accent-solid-text font-medium hover:bg-accent-solid/80 transition-colors"
              >
                {editingFieldIndex !== null ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for users */}
      <BottomNavigation userType={userType} />
    </div>
  );
}
