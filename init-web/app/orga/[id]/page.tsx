"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Users, CalendarDays, Clock, ChevronRight } from "lucide-react";
import { authService } from "../../services/auth.service";
import {
  eventService,
  transformEventResponse,
  Event,
  EventResponse,
  OrgaPublicProfile,
} from "../../services/event.service";
import BottomNavigation from "../../components/BottomNavigation";
import DesktopNav from "../../components/DesktopNav";
import ThemeToggle from "../../components/ThemeToggle";

export default function OrgaProfilePage() {
  const router = useRouter();
  const params = useParams();
  const orgaId = parseInt(params.id as string);

  const [orga, setOrga] = useState<OrgaPublicProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<"user" | "orga" | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [orga]);

  useEffect(() => {
    const init = async () => {
      const validatedType = await authService.validateAndGetUserType();
      if (!validatedType) {
        router.push("/auth");
        return;
      }
      setUserType(validatedType);

      try {
        const [profile, orgaEvents] = await Promise.all([
          eventService.getOrgaPublicProfile(orgaId),
          eventService.getOrgaPublicEvents(orgaId),
        ]);
        setOrga(profile);
        setEvents(orgaEvents.map((e: EventResponse) => transformEventResponse(e)));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur lors du chargement";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [orgaId]);

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

  const getThemeGradient = (theme: string) => {
    const gradients: Record<string, string> = {
      musique: "from-purple-500/20 to-purple-500/5",
      professionnel: "from-blue-500/20 to-blue-500/5",
      étudiant: "from-green-500/20 to-green-500/5",
      sport: "from-orange-500/20 to-orange-500/5",
      café: "from-amber-500/20 to-amber-500/5",
      fête: "from-pink-500/20 to-pink-500/5",
      général: "from-gray-500/20 to-gray-500/5",
    };
    return gradients[theme.toLowerCase()] || "from-gray-500/20 to-gray-500/5";
  };

  const formatMemberSince = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !orga) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Organisation non trouvee"}</p>
          <Link href="/events" className="text-[#1271FF] hover:underline">
            Retour aux evenements
          </Link>
        </div>
      </div>
    );
  }

  const logoUrl = orga.logo_path ? `${API_URL}${orga.logo_path}` : null;

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.appEndAt) >= now);
  const pastEvents = events.filter((e) => new Date(e.appEndAt) < now);
  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const renderEventCard = (event: Event) => (
    <Link
      key={event.id}
      href={`/events/${event.id}`}
      className={`group bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-[#1271FF]/30 transition-all duration-300 hover:shadow-lg flex flex-col ${activeTab === "past" ? "opacity-60 hover:opacity-90" : ""}`}
    >
      {/* Image with overlay gradient */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span
            className={`${getThemeColor(event.theme)} text-white text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm`}
          >
            {event.theme}
          </span>
        </div>
        {activeTab === "past" && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/50 text-white/90 text-xs font-medium px-2.5 py-1 rounded-lg backdrop-blur-sm">
              Termine
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-poppins font-semibold text-white text-base drop-shadow-md line-clamp-2">
            {event.name}
          </h3>
        </div>
      </div>

      {/* Card body with gradient accent */}
      <div className={`p-4 flex-1 bg-gradient-to-b ${getThemeGradient(event.theme)}`}>
        <div className="space-y-2">
          {event.hasPhysicalEvent && (
            <>
              <div className="flex items-center gap-2.5 text-primary">
                <div className="w-7 h-7 rounded-lg bg-badge flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm">{event.physicalDate}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2.5 text-primary">
                  <div className="w-7 h-7 rounded-lg bg-badge flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm truncate">{event.location}</span>
                </div>
              )}
            </>
          )}
          {!event.hasPhysicalEvent && (
            <div className="flex items-center gap-2.5 text-primary">
              <div className="w-7 h-7 rounded-lg bg-badge flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm">{event.appDate}</span>
            </div>
          )}
        </div>

        {/* Participants bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full h-2 bg-[#1271FF]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1271FF] rounded-full transition-all"
                style={{
                  width: `${Math.min((event.participants / event.maxParticipants) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted shrink-0">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {event.participants}/{event.maxParticipants}
            </span>
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-3 flex items-center justify-end text-[#1271FF] opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium">Voir l'evenement</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-page pointer-events-none" />
        <div className="relative px-6 md:px-12 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <Link href="/">
              <Image src="/logoLight.svg" alt="Init Logo" width={200} height={80} className="h-20 md:h-24 w-auto dark:hidden" />
              <Image src="/logoDark.svg" alt="Init Logo" width={200} height={80} className="h-20 md:h-24 w-auto hidden dark:block" />
            </Link>
          </div>
          <DesktopNav />
          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ paddingTop: headerHeight }} className="pb-24">
        <div className="max-w-4xl mx-auto px-6">

          {/* Hero Banner */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1271FF] to-[#0a4fbf] p-6 md:p-10 mb-8">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={orga.nom}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border-4 border-white/20 shadow-xl">
                  <span className="font-bold text-4xl md:text-5xl text-white">
                    {orga.nom.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="font-poppins text-2xl md:text-3xl font-bold text-white mb-2">
                  {orga.nom}
                </h1>
                <p className="text-white/70 text-sm mb-4">
                  Organisateur depuis {formatMemberSince(orga.created_at)}
                </p>

                {/* Stats inline */}
                <div className="flex justify-center md:justify-start gap-6">
                  <div>
                    <p className="text-2xl font-bold text-white">{orga.event_count}</p>
                    <p className="text-xs text-white/60">evenements</p>
                  </div>
                  <div className="w-px bg-white/20" />
                  <div>
                    <p className="text-2xl font-bold text-white">{orga.total_participants}</p>
                    <p className="text-xs text-white/60">participants</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {orga.description && (
            <div className="mb-8 bg-card border border-border/50 rounded-2xl p-5 md:p-6">
              <h2 className="font-semibold text-base text-primary mb-3">
                A propos
              </h2>
              <p className="text-muted leading-relaxed whitespace-pre-wrap break-words hyphens-auto text-sm">
                {orga.description}
              </p>
            </div>
          )}

          {/* Events Section */}
          <div>
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-badge rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "upcoming"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted hover:text-primary"
                }`}
              >
                <Calendar className="w-4 h-4" />
                A venir ({upcomingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "past"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted hover:text-primary"
                }`}
              >
                <Clock className="w-4 h-4" />
                Passes ({pastEvents.length})
              </button>
            </div>

            {/* Event grid */}
            {displayedEvents.length === 0 ? (
              <div className="bg-card border border-border/50 rounded-2xl p-10 text-center">
                <CalendarDays className="w-12 h-12 text-muted/40 mx-auto mb-4" />
                <p className="text-muted font-medium mb-1">
                  {activeTab === "upcoming" ? "Aucun evenement a venir" : "Aucun evenement passe"}
                </p>
                <p className="text-muted/60 text-sm">
                  {activeTab === "upcoming"
                    ? "Revenez plus tard pour decouvrir les prochains evenements."
                    : "Cet organisateur n'a pas encore d'evenements termines."}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {displayedEvents.map(renderEventCard)}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation userType={userType} />
    </div>
  );
}
