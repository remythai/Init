"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Users, Clock } from "lucide-react";
import { authService } from "../../services/auth.service";
import {
  eventService,
  transformEventResponse,
  Event,
  EventResponse,
} from "../../services/event.service";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/auth");
      return;
    }
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    setError("");

    try {
      const userType = authService.getUserType();
      let eventData: EventResponse;

      if (userType === "orga") {
        const response = await authService.authenticatedFetch(`/api/events/${eventId}`);
        if (!response.ok) throw new Error("Événement non trouvé");
        const data = await response.json();
        eventData = data.data;
      } else {
        const response = await eventService.getPublicEvents({ limit: 100 });
        const found = response.events.find((e) => e.id === parseInt(eventId));
        if (!found) throw new Error("Événement non trouvé");
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

  const handleRegister = async () => {
    if (!event) return;
    setRegistering(true);

    try {
      await eventService.registerToEvent(event.id);
      await loadEvent();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!event) return;
    setRegistering(true);

    try {
      await eventService.unregisterFromEvent(event.id);
      await loadEvent();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la désinscription";
      setError(message);
    } finally {
      setRegistering(false);
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
          <p className="text-red-500 mb-4">{error || "Événement non trouvé"}</p>
          <Link
            href="/events"
            className="text-[#1271FF] hover:underline"
          >
            Retour aux événements
          </Link>
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
          <Link
            href="/events"
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Retour aux événements
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button (mobile) */}
          <div className="px-4 py-4 md:hidden">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-[#303030]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
          </div>

          {/* Event Image */}
          <div className="relative h-64 md:h-96">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <span
                className={`${getThemeColor(event.theme)} text-white text-sm font-semibold px-4 py-2 rounded-lg`}
              >
                {event.theme}
              </span>
            </div>
            {event.isRegistered && (
              <div className="absolute top-4 right-4">
                <span className="bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Inscrit
                </span>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="px-4 md:px-8 py-6">
            <h1 className="font-poppins text-2xl md:text-4xl font-bold text-[#303030] mb-6">
              {event.name}
            </h1>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Calendar className="w-6 h-6 text-[#1271FF] mb-2" />
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="text-sm font-medium text-[#303030]">{event.date}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Clock className="w-6 h-6 text-[#1271FF] mb-2" />
                <p className="text-xs text-gray-500 mb-1">Horaire</p>
                <p className="text-sm font-medium text-[#303030]">18:00 - 22:00</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <MapPin className="w-6 h-6 text-[#1271FF] mb-2" />
                <p className="text-xs text-gray-500 mb-1">Lieu</p>
                <p className="text-sm font-medium text-[#303030]">{event.location}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <Users className="w-6 h-6 text-[#1271FF] mb-2" />
                <p className="text-xs text-gray-500 mb-1">Participants</p>
                <p className="text-sm font-medium text-[#303030]">
                  {event.participants}/{event.maxParticipants}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Places restantes</span>
                <span>{event.maxParticipants - event.participants} places</span>
              </div>
              <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1271FF] rounded-full transition-all"
                  style={{
                    width: `${(event.participants / event.maxParticipants) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-8">
                <h2 className="font-poppins text-xl font-semibold text-[#303030] mb-3">
                  À propos
                </h2>
                <p className="text-gray-600 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {event.isRegistered ? (
                <>
                  <button
                    onClick={handleUnregister}
                    disabled={registering}
                    className="flex-1 py-4 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {registering ? "Désinscription..." : "Se désinscrire"}
                  </button>
                  <Link
                    href={`/events/${eventId}/environment/swiper`}
                    className="flex-1 py-4 rounded-xl bg-[#303030] text-white font-semibold hover:bg-[#404040] transition-colors text-center"
                  >
                    Accéder à l'environnement
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering || event.participants >= event.maxParticipants}
                  className="w-full py-4 rounded-xl bg-[#1271FF] text-white font-semibold hover:bg-[#0d5dd8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering
                    ? "Inscription..."
                    : event.participants >= event.maxParticipants
                    ? "Complet"
                    : "S'inscrire à l'événement"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
