"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Calendar, Users, MoreVertical, X, Plus } from "lucide-react";
import { authService } from "../services/auth.service";
import {
  eventService,
  transformEventResponses,
  Event,
} from "../services/event.service";

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
    start_at: "",
    end_at: "",
    location: "",
    max_participants: "",
    is_public: true,
    has_link_access: true,
    theme: "Professionnel",
  });

  useEffect(() => {
    checkAuthAndLoadEvents();
  }, []);

  const checkAuthAndLoadEvents = async () => {
    if (!authService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    const type = authService.getUserType();
    setUserType(type);
    await loadEvents(type);
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
        setEvents(transformEventResponses(response.events));
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
      setCreateError("Le nom de l'événement est requis");
      return;
    }
    if (!formData.location.trim()) {
      setCreateError("Le lieu est requis");
      return;
    }
    if (!formData.start_at) {
      setCreateError("La date de début est requise");
      return;
    }
    if (!formData.end_at) {
      setCreateError("La date de fin est requise");
      return;
    }

    const startDate = new Date(formData.start_at);
    const endDate = new Date(formData.end_at);

    if (endDate <= startDate) {
      setCreateError("La date de fin doit être après la date de début");
      return;
    }

    const maxParticipants = parseInt(formData.max_participants);
    if (formData.max_participants && (isNaN(maxParticipants) || maxParticipants < 1)) {
      setCreateError("Le nombre de participants doit être supérieur à 0");
      return;
    }

    setCreating(true);

    try {
      await eventService.createEvent({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        location: formData.location.trim(),
        max_participants: maxParticipants || 50,
        is_public: formData.is_public,
        has_link_access: formData.has_link_access,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        start_at: "",
        end_at: "",
        location: "",
        max_participants: "",
        is_public: true,
        has_link_access: true,
        theme: "Professionnel",
      });

      setIsCreateOpen(false);
      await loadEvents(userType);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création";
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
    { value: "étudiant", label: "Étudiant" },
    { value: "sport", label: "Sport" },
    { value: "café", label: "Café" },
    { value: "fête", label: "Fête" },
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
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme =
      selectedTheme === "all" ||
      event.theme.toLowerCase() === selectedTheme.toLowerCase();
    const matchesAvailability =
      !onlyAvailable || event.participants < event.maxParticipants;

    return matchesFilter && matchesSearch && matchesTheme && matchesAvailability;
  });

  const hasActiveFilters = selectedTheme !== "all" || onlyAvailable;

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
          <button
            onClick={handleLogout}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

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
              <p className="text-gray-500 text-lg">
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
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{event.location}</span>
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
        <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-40">
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

      {/* Floating Action Button (for organizers) */}
      {userType === "orga" && (
        <button
          onClick={() => setIsCreateOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#1271FF] hover:bg-[#0d5dd8] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-40"
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
                    <p className="text-sm text-gray-500">
                      Masquer les événements complets
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
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => {
                  setSelectedTheme("all");
                  setOnlyAvailable(false);
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez votre événement..."
                  rows={3}
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none disabled:bg-gray-100"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Date et heure de début *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                    disabled={creating}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Date et heure de fin *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                    disabled={creating}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Lieu *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Station F, Paris 13e"
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                />
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Nombre maximum de participants
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  placeholder="50"
                  min="1"
                  disabled={creating}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                />
              </div>

              {/* Access Settings */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-[#303030]">Paramètres d'accès</h3>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Événement public</p>
                    <p className="text-sm text-gray-500">Visible par tous les utilisateurs</p>
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
                  onClick={() => setFormData({ ...formData, has_link_access: !formData.has_link_access })}
                  disabled={creating}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
                >
                  <div className="text-left">
                    <p className="font-medium text-[#303030]">Accès par lien</p>
                    <p className="text-sm text-gray-500">Autoriser l'inscription via un lien</p>
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
                {creating ? "Création..." : "Créer l'événement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
