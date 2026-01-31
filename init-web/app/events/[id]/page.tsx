"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Trash2, Flag, LogIn, X, Edit2, UserCheck, Check } from "lucide-react";
import { authService } from "../../services/auth.service";
import {
  eventService,
  transformEventResponse,
  Event,
  EventResponse,
  CustomField,
} from "../../services/event.service";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [userType, setUserType] = useState<"user" | "orga" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [profilInfo, setProfilInfo] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initPage = async () => {
      // Validate token and get user type
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      console.log("Validated user type:", validatedType);
      setUserType(validatedType);
      loadEvent(validatedType);
    };

    initPage();
  }, [eventId]);

  const loadEvent = async (type: "user" | "orga" | null) => {
    setLoading(true);
    setError("");

    try {
      let eventData: EventResponse;

      if (type === "orga") {
        console.log("Loading event as orga, calling /api/events/" + eventId);
        const response = await authService.authenticatedFetch(`/api/events/${eventId}`);
        if (!response.ok) {
          // If orga gets 401/403, the token might be invalid or user type mismatch
          if (response.status === 401 || response.status === 403) {
            console.warn("Orga endpoint failed, falling back to user endpoint");
            // Fall back to user endpoint
            const userResponse = await eventService.getPublicEvents({ upcoming: false, limit: 200 });
            const found = userResponse.events.find((e) => e.id === parseInt(eventId));
            if (!found) throw new Error("Evenement non trouve");
            eventData = found;
          } else {
            throw new Error("Evenement non trouve");
          }
        } else {
          const data = await response.json();
          eventData = data.data;
        }
      } else {
        console.log("Loading event as user, calling getPublicEvents");
        // Fetch without upcoming filter to get all events including past ones
        const response = await eventService.getPublicEvents({ upcoming: false, limit: 200 });
        const found = response.events.find((e) => e.id === parseInt(eventId));
        if (!found) throw new Error("Evenement non trouve");
        eventData = found;
      }

      setEvent(transformEventResponse(eventData));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);

    try {
      await eventService.deleteEvent(event.id);
      setShowDeleteConfirm(false);
      setSuccessMessage("L'evenement a ete supprime avec succes");
      setTimeout(() => {
        router.push("/events");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(message);
      setDeleting(false);
    }
  };

  const hasRequiredFields = event?.customFields?.some((field) => field.required) ?? false;

  const validateProfilInfo = (): boolean => {
    if (!event?.customFields || event.customFields.length === 0) return true;

    const errors: Record<string, string> = {};

    event.customFields.forEach((field) => {
      const value = profilInfo[field.id];

      if (field.required && (value === undefined || value === null || value === "")) {
        errors[field.id] = `Le champ "${field.label}" est requis`;
        return;
      }

      if (!field.required && (value === undefined || value === null || value === "")) {
        return;
      }

      if (field.type === "email" && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = "Email invalide";
        }
      }

      if (field.type === "phone" && typeof value === "string") {
        const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, "").length < 10) {
          errors[field.id] = "Numero de telephone invalide";
        }
      }

      if (field.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors[field.id] = "Doit etre un nombre";
        } else {
          if (field.min !== undefined && num < field.min) {
            errors[field.id] = `Minimum ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[field.id] = `Maximum ${field.max}`;
          }
        }
      }

      if (field.pattern && typeof value === "string") {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors[field.id] = `Format invalide`;
        }
      }

      if (field.type === "multiselect" && field.required) {
        if (!Array.isArray(value) || value.length === 0) {
          errors[field.id] = "Veuillez selectionner au moins une option";
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitRegistration = async (profile: Record<string, unknown>) => {
    if (!event) return;
    setRegistering(true);

    try {
      await eventService.registerToEvent(event.id, { profil_info: profile });
      setShowRegistrationModal(false);
      setProfilInfo({});
      setFieldErrors({});
      setSuccessMessage("Vous etes maintenant inscrit a cet evenement !");
      await loadEvent(userType);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterClick = () => {
    if (!event) return;

    if (event.customFields && event.customFields.length > 0) {
      setShowRegistrationModal(true);
    } else {
      submitRegistration({});
    }
  };

  const handleConfirmProfile = () => {
    if (!validateProfilInfo()) return;
    submitRegistration(profilInfo);
  };

  const renderCustomField = (field: CustomField) => {
    const errorText = fieldErrors[field.id];

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : "text"}
              className={`w-full px-4 py-3 border rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] ${
                errorText ? "border-red-500" : "border-gray-200"
              }`}
              placeholder={field.placeholder}
              value={profilInfo[field.id] !== undefined ? String(profilInfo[field.id]) : ""}
              onChange={(e) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
                }))
              }
            />
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              className={`w-full px-4 py-3 border rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] min-h-[100px] ${
                errorText ? "border-red-500" : "border-gray-200"
              }`}
              placeholder={field.placeholder}
              value={(profilInfo[field.id] as string) || ""}
              onChange={(e) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: e.target.value,
                }))
              }
            />
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              className={`w-full px-4 py-3 border rounded-xl text-[#303030] focus:outline-none focus:ring-2 focus:ring-[#1271FF] ${
                errorText ? "border-red-500" : "border-gray-200"
              }`}
              value={(profilInfo[field.id] as string) || ""}
              onChange={(e) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: e.target.value,
                }))
              }
            />
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  profilInfo[field.id] ? "bg-[#303030] border-[#303030]" : "border-gray-300"
                }`}
                onClick={() =>
                  setProfilInfo((prev) => ({
                    ...prev,
                    [field.id]: !prev[field.id],
                  }))
                }
              >
                {Boolean(profilInfo[field.id]) && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      case "radio":
      case "select":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.placeholder && (
              <p className="text-xs text-gray-500 mb-2 italic">{field.placeholder}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full px-4 py-3 border rounded-xl text-left transition-colors ${
                    profilInfo[field.id] === option.value
                      ? "bg-[#303030] text-white border-[#303030]"
                      : "border-gray-200 text-[#303030] hover:border-gray-300"
                  }`}
                  onClick={() =>
                    setProfilInfo((prev) => ({
                      ...prev,
                      [field.id]: option.value,
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      case "multiselect":
        const selectedValues = (profilInfo[field.id] as string[]) || [];
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.placeholder && (
              <p className="text-xs text-gray-500 mb-2 italic">{field.placeholder}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full px-4 py-3 border rounded-xl text-left transition-colors flex items-center gap-3 ${
                      isSelected
                        ? "bg-[#303030] text-white border-[#303030]"
                        : "border-gray-200 text-[#303030] hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setProfilInfo((prev) => {
                        const current = (prev[field.id] as string[]) || [];
                        const newValues = isSelected
                          ? current.filter((v) => v !== option.value)
                          : [...current, option.value];
                        return {
                          ...prev,
                          [field.id]: newValues,
                        };
                      });
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected ? "bg-white border-white" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#303030]" />}
                    </div>
                    {option.label}
                  </button>
                );
              })}
            </div>
            {errorText && <p className="text-red-500 text-sm mt-1">{errorText}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const handleUnregister = async () => {
    if (!event) return;

    if (!confirm("Etes-vous sur de vouloir vous desinscrire de cet evenement ?")) {
      return;
    }

    setRegistering(true);

    try {
      await eventService.unregisterFromEvent(event.id);
      setSuccessMessage("Desinscription reussie");
      await loadEvent(userType);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la desinscription";
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleReport = (reason: string) => {
    // TODO: Implement report API
    setShowReportModal(false);
    setSuccessMessage("Signalement envoye. Notre equipe va l'examiner.");
    setTimeout(() => setSuccessMessage(""), 3000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Evenement non trouve"}</p>
          <Link
            href="/events"
            className="text-[#1271FF] hover:underline"
          >
            Retour aux evenements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Like mobile _layout.tsx */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/events")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#303030]" />
          </button>

          {userType === "orga" ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-6 h-6 text-red-500" />
            </button>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Flag className="w-6 h-6 text-[#303030]" />
            </button>
          )}
        </div>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg text-center">
          {successMessage}
        </div>
      )}

      {/* Main Content - Same for both users and organizers like mobile */}
      <main className="pt-14 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Event Image */}
          <div className="relative h-64">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4">
              <span
                className={`${getThemeColor(event.theme)} text-white text-sm font-semibold px-3 py-1.5 rounded-md`}
              >
                {event.theme}
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="px-6 py-6">
            <h1 className="font-poppins text-2xl font-bold text-[#303030] mb-4">
              {event.name}
            </h1>

            {/* Info Cards - Like mobile EventDetails.tsx */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                <Calendar className="w-5 h-5 text-[#303030] mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[#303030]">Date</p>
                  <p className="text-sm text-gray-600">{event.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                <Clock className="w-5 h-5 text-[#303030] mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[#303030]">Heure</p>
                  <p className="text-sm text-gray-600">18:00 - 22:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                <MapPin className="w-5 h-5 text-[#303030] mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[#303030]">Lieu</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                <Users className="w-5 h-5 text-[#303030] mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-[#303030]">Participants</p>
                  <p className="text-sm text-gray-600">
                    {event.participants}/{event.maxParticipants} inscrits
                  </p>
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-[#1271FF] rounded-full transition-all"
                      style={{
                        width: `${(event.participants / event.maxParticipants) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="font-semibold text-lg text-[#303030] mb-3">
                A propos de l'evenement
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {event.description || "Rejoignez-nous pour un moment unique de partage et de rencontre. Cet evenement est l'occasion parfaite pour elargir votre reseau et faire de nouvelles connexions dans une ambiance conviviale et decontractee."}
              </p>
            </div>

            {/* Organizer Section */}
            <div className="mb-6">
              <h2 className="font-semibold text-lg text-[#303030] mb-3">
                Organisateur
              </h2>
              <div className="flex items-center gap-3 p-4 bg-[#F5F5F5] rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] border-2 border-[#303030] flex items-center justify-center">
                  <span className="font-semibold text-xl text-[#303030]">O</span>
                </div>
                <div>
                  <p className="font-semibold text-[#303030]">Organisation Init</p>
                  <p className="text-xs text-gray-600">Organisateur verifie</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          {userType === "orga" ? (
            /* Organizer actions - Modify, Delete, View Participants */
            <div className="space-y-3">
              <div className="flex gap-3">
                <Link
                  href={`/events/${eventId}/edit`}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-[#1271FF] text-white font-semibold hover:bg-[#0d5dd8] transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                  Modifier
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <Link
                href={`/events/${eventId}/participants`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                <UserCheck className="w-5 h-5" />
                Voir les participants ({event.participants})
              </Link>
            </div>
          ) : event.isRegistered ? (
            /* User registered - show unregister/enter buttons */
            <div className="flex gap-3">
              <button
                onClick={handleUnregister}
                disabled={registering}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                {registering ? "Chargement..." : "Se desinscrire"}
              </button>
              <Link
                href={`/events/${eventId}/environment/swiper`}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-[#303030] text-white font-semibold hover:bg-[#404040] transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Entrer
              </Link>
            </div>
          ) : (
            /* User not registered */
            <button
              onClick={handleRegisterClick}
              disabled={registering || event.participants >= event.maxParticipants}
              className="w-full py-4 rounded-xl bg-[#303030] text-white font-semibold hover:bg-[#404040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering
                ? "Inscription..."
                : event.participants >= event.maxParticipants
                ? "Complet"
                : "Participer a cet evenement"}
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal - Like mobile Alert */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 w-full">
            <h3 className="font-semibold text-lg text-[#303030] mb-2">
              Supprimer l'evenement
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Etes-vous sur de vouloir supprimer cet evenement ? Cette action est irreversible.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="w-full py-3 rounded-xl text-[#303030] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 rounded-xl text-red-500 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal - Like mobile Alert */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowReportModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 w-full">
            <h3 className="font-semibold text-lg text-[#303030] mb-2">
              Signaler l'evenement
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Pour quelle raison souhaitez-vous signaler cet evenement ?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full py-3 rounded-xl text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReport("inappropriate")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Contenu inapproprie
              </button>
              <button
                onClick={() => handleReport("false_info")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Fausses informations
              </button>
              <button
                onClick={() => handleReport("spam")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Spam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal with Custom Fields */}
      {showRegistrationModal && event?.customFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !registering && setShowRegistrationModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full max-h-[80vh] flex flex-col">
            <h3 className="font-semibold text-lg text-[#303030] mb-2">
              Informations requises pour l'inscription
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Veuillez remplir les informations demandees par l'organisateur.
            </p>

            <div className="overflow-y-auto flex-1 pr-2">
              {event.customFields.map((field) => renderCustomField(field))}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowRegistrationModal(false);
                  setFieldErrors({});
                }}
                disabled={registering}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmProfile}
                disabled={registering}
                className="flex-1 py-3 rounded-xl bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors disabled:opacity-50"
              >
                {registering ? "Validation..." : "Valider et s'inscrire"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
