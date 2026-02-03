"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Calendar, Users, MoreVertical, X, Plus, Trash2, Edit2, User } from "lucide-react";
import { authService } from "../services/auth.service";
import {
  eventService,
  transformEventResponses,
  Event,
  CustomField,
  getFieldId,
} from "../services/event.service";
import BottomNavigation from "../components/BottomNavigation";

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
    // Validate token and get user type - this also clears invalid auth
    const validatedType = await authService.validateAndGetUserType();

    if (!validatedType) {
      router.push("/auth");
      return;
    }

    console.log("Validated user type:", validatedType);
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
        console.log("Public events response:", response);
        setEvents(transformEventResponses(response.events || []));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
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
      event.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
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

    return matchesFilter && matchesSearch && matchesTheme && matchesAvailability && matchesDate;
  });

  const hasActiveFilters = selectedTheme !== "all" || onlyAvailable || dateFilter !== "all";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden md:inline">Mon Profil</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              Deconnexion
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
      <main className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Page Title */}
          <div className="py-6 md:py-8">
            <h1 className="font-poppins text-2xl md:text-3xl font-bold text-[#303030]">
              {userType === "orga" ? "Mes événements" : "Événements"}
            </h1>
            <p className="text-gray-600 mt-1">
              {userType === "orga"
                ? "Gérez vos événements"
                : "Découvrez les événements près de chez vous"}
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030] placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => setIsAdvancedOpen(true)}
              className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors relative"
            >
              <MoreVertical className="w-5 h-5 text-[#303030]" />
              {hasActiveFilters && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#1271FF] rounded-full"></span>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">
                {searchQuery
                  ? "Aucun événement ne correspond à votre recherche"
                  : activeFilter === "registered"
                  ? "Vous n'êtes inscrit à aucun événement"
                  : userType === "orga"
                  ? "Vous n'avez pas encore créé d'événement"
                  : "Aucun événement disponible"}
              </p>
              {userType === "orga" && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 bg-[#1271FF] hover:bg-[#0d5dd8] text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Créer mon premier événement
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  {/* Event Image */}
                  <div className="relative h-48">
                    <img
                      src={event.image}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 right-3 flex justify-between">
                      <span
                        className={`${getThemeColor(event.theme)} text-white text-xs font-semibold px-3 py-1.5 rounded-md`}
                      >
                        {event.theme}
                      </span>
                      {event.isRegistered && (
                        <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md">
                          Inscrit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Content */}
                  <div className="p-4">
                    <h3 className="font-poppins font-semibold text-lg text-[#303030] mb-3">
                      {event.name}
                    </h3>

                    <div className="space-y-2">
                      {event.hasPhysicalEvent && (
                        <>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">{event.physicalDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{event.location || 'Lieu a confirmer'}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">App</span>
                        <span className="text-sm">{event.appDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {event.participants}/{event.maxParticipants} participants
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
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

                    {/* Enter Button for registered events */}
                    {event.isRegistered && (
                      <Link
                        href={`/events/${event.id}/environment/swiper`}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full mt-4 bg-[#303030] hover:bg-[#404040] text-white py-3 rounded-lg font-medium transition-colors text-center"
                      >
                        Accéder à l'environnement
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Filter Tabs (for users) */}
      {userType === "user" && (
        <div className="fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-40">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg flex max-w-md mx-auto">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-[#303030] text-white"
                  : "text-[#303030] hover:bg-gray-100"
              }`}
            >
              Tous les événements
            </button>
            <button
              onClick={() => setActiveFilter("registered")}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all ${
                activeFilter === "registered"
                  ? "bg-[#303030] text-white"
                  : "text-[#303030] hover:bg-gray-100"
              }`}
            >
              Mes événements
            </button>
          </div>
        </div>
      )}

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
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsAdvancedOpen(false)}
          />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Recherche avancée
              </h2>
              <button
                onClick={() => setIsAdvancedOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Theme Filter */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-3">
                  Type d'événement
                </label>
                <div className="flex flex-wrap gap-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setSelectedTheme(theme.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTheme === theme.value
                          ? "bg-[#303030] text-white"
                          : "bg-gray-100 text-[#303030] hover:bg-gray-200"
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
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-[#303030]">
                      Places disponibles uniquement
                    </p>
                    <p className="text-sm text-gray-600">
                      Masquer les evenements complets
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      onlyAvailable ? "bg-[#1271FF]" : "bg-gray-300"
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
                <label className="block text-sm font-semibold text-[#303030] mb-3">
                  Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {dateFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        dateFilter === filter.value
                          ? "bg-[#303030] text-white"
                          : "bg-gray-100 text-[#303030] hover:bg-gray-200"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => {
                  setSelectedTheme("all");
                  setOnlyAvailable(false);
                  setDateFilter("all");
                }}
                className="flex-1 py-3 rounded-lg border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setIsAdvancedOpen(false)}
                className="flex-1 py-3 rounded-lg bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors"
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
            className="absolute inset-0 bg-black/50"
            onClick={() => !creating && setIsCreateOpen(false)}
          />
          <div className="relative bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                Créer un événement
              </h2>
              <button
                onClick={() => !creating && setIsCreateOpen(false)}
                disabled={creating}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-[#303030]" />
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
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Soirée Networking"
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                />
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
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
                          ? "bg-[#303030] text-white"
                          : "bg-gray-100 text-[#303030] hover:bg-gray-200"
                      } disabled:opacity-50`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Decrivez votre evenement..."
                  rows={3}
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none disabled:bg-gray-100"
                />
              </div>

              {/* App Availability Dates (Required) */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-[#303030]">
                  Disponibilite de l'app *
                </h3>
                <p className="text-sm text-gray-600">
                  Periode pendant laquelle les utilisateurs peuvent acceder au swiper, matcher et discuter.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#303030] mb-2">
                      Debut de disponibilite *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.app_start_at}
                      onChange={(e) => setFormData({ ...formData, app_start_at: e.target.value })}
                      disabled={creating}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#303030] mb-2">
                      Fin de disponibilite *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.app_end_at}
                      onChange={(e) => setFormData({ ...formData, app_end_at: e.target.value })}
                      disabled={creating}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Event Toggle */}
              <div className="space-y-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_physical_event: !formData.has_physical_event })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Evenement physique</p>
                    <p className="text-sm text-gray-600">
                      {formData.has_physical_event ? "L'evenement a un lieu et une date" : "Pas de lieu ni de date physique"}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_physical_event ? "bg-[#1271FF]" : "bg-gray-300"
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
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">
                      Quand et ou se deroule l'evenement physique.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#303030] mb-2">
                          Debut de l'evenement *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.start_at}
                          onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                          disabled={creating}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#303030] mb-2">
                          Fin de l'evenement *
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end_at}
                          onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                          disabled={creating}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                        />
                      </div>
                    </div>

                    {/* Location inside physical event section */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-[#303030] mb-2">
                        Lieu *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                        />
                        {loadingSuggestions && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>

                      {/* Address Suggestions */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.place_id}
                              type="button"
                              onClick={() => selectAddress(suggestion)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
                            >
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-[#303030] line-clamp-2">
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
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Nombre maximum de participants *
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="Ex: 50"
                  min="1"
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                />
              </div>

              {/* Access Settings */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-[#303030]">Parametres d'acces</h3>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Evenement public</p>
                    <p className="text-sm text-gray-600">Visible par tous les utilisateurs</p>
                    <p className={`text-xs font-semibold mt-1 ${formData.is_public ? "text-green-600" : "text-red-500"}`}>
                      {formData.is_public ? "✓ PUBLIC - Visible dans la liste" : "✗ PRIVE - Non visible"}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.is_public ? "bg-[#1271FF]" : "bg-gray-300"
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
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Liste blanche</p>
                    <p className="text-sm text-gray-600">Restreindre l'acces a certaines personnes</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_whitelist ? "bg-[#1271FF]" : "bg-gray-300"
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
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Acces par lien</p>
                    <p className="text-sm text-gray-600">Autoriser l'inscription via un lien</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_link_access ? "bg-[#1271FF]" : "bg-gray-300"
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
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Acces par mot de passe</p>
                    <p className="text-sm text-gray-600">Proteger l'evenement par mot de passe</p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${
                      formData.has_password_access ? "bg-[#1271FF]" : "bg-gray-300"
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
                    <label className="block text-sm font-semibold text-[#303030] mb-2">
                      Mot de passe d'acces *
                    </label>
                    <input
                      type="password"
                      value={formData.access_password}
                      onChange={(e) => setFormData({ ...formData, access_password: e.target.value })}
                      placeholder="Entrez un mot de passe"
                      disabled={creating}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>

              {/* Custom Fields */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#303030]">Champs personnalises</h3>
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
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-[#303030]">{field.label}</p>
                          <p className="text-xs text-gray-600">
                            {fieldTypes.find((t) => t.value === field.type)?.label} {field.required && "- Requis"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCustomField(index)}
                            className="p-1 text-gray-600 hover:text-[#1271FF]"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(index)}
                            className="p-1 text-gray-600 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {customFields.length === 0 && (
                  <p className="text-sm text-gray-400 italic">
                    Ajoutez des champs pour collecter des informations supplementaires
                  </p>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-[#303030]">Parametres avances</h3>

                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Cooldown (en heures)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldown}
                    onChange={(e) => setFormData({ ...formData, cooldown: e.target.value })}
                    placeholder="Ex: 24"
                    min="0"
                    disabled={creating}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Delai avant de pouvoir s'inscrire a nouveau
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setIsCreateOpen(false)}
                disabled={creating}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creating}
                className="flex-1 py-3 rounded-xl bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors disabled:opacity-50"
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
            className="absolute inset-0 bg-black/50"
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
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Field Label (Question) */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Question *
                </label>
                <input
                  type="text"
                  value={currentField.label}
                  onChange={(e) =>
                    setCurrentField({ ...currentField, label: e.target.value })
                  }
                  placeholder="Ex: Quel est votre profil LinkedIn ?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                />
                <p className="text-xs text-gray-500 mt-1">Cette question sera affichee aux participants</p>
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
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
                          : "bg-gray-100 text-[#303030] hover:bg-gray-200"
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
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Champ requis</p>
                  <p className="text-sm text-gray-600">Obligatoire lors de l'inscription</p>
                </div>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    currentField.required ? "bg-[#1271FF]" : "bg-gray-300"
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
                <div className="space-y-3 pt-4 border-t">
                  <label className="block text-sm font-semibold text-[#303030]">
                    Choix possibles *
                  </label>

                  {currentField.options && currentField.options.length > 0 && (
                    <div className="space-y-2">
                      {currentField.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <p className="font-medium text-[#303030]">{option}</p>
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
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-sm"
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
            <div className="flex gap-3 p-5 border-t">
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
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCustomField}
                className="flex-1 py-3 rounded-xl bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors"
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
