"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, Users, CalendarDays } from "lucide-react";
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
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
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
      "étudiant": "bg-green-500",
      sport: "bg-orange-500",
      "café": "bg-amber-500",
      "fête": "bg-pink-500",
      "général": "bg-gray-500",
    };
    return colors[theme.toLowerCase()] || "bg-gray-500";
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

  const renderEventCard = (event: Event) => (
    <Link
      key={event.id}
      href={`/events/${event.id}`}
      className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-[1.01] flex flex-col"
    >
      <div className="relative h-40">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-3 left-3">
          <span
            className={`${getThemeColor(event.theme)} text-white text-xs font-semibold px-2.5 py-1 rounded-md`}
          >
            {event.theme}
          </span>
        </div>
      </div>
      <div className="p-4 flex-1">
        <h3 className="font-poppins font-semibold text-base text-primary mb-2">
          {event.name}
        </h3>
        <div className="space-y-1.5">
          {event.hasPhysicalEvent && (
            <>
              <div className="flex items-center gap-2 text-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">{event.physicalDate}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-muted">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs">{event.location}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 text-muted">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">
              {event.participants}/{event.maxParticipants} participants
            </span>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full h-1.5 bg-[#1271FF]/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1271FF] rounded-full transition-all"
              style={{
                width: `${Math.min((event.participants / event.maxParticipants) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-page pointer-events-none" />
        <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <Link href="/">
              <Image src="/LogoPng.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto dark:hidden" />
              <Image src="/logo.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto hidden dark:block" />
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

          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mb-8">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={orga.nom}
                className="w-24 h-24 rounded-full object-cover mb-4 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#1271FF] flex items-center justify-center mb-4 shadow-md">
                <span className="font-bold text-4xl text-white">
                  {orga.nom.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="font-poppins text-2xl font-bold text-primary mb-1">
              {orga.nom}
            </h1>
            <p className="text-sm text-muted">
              Membre depuis {formatMemberSince(orga.created_at)}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 bg-badge rounded-xl p-4 text-center">
              <p className="font-bold text-2xl text-primary">{orga.event_count}</p>
              <p className="text-xs text-muted mt-1">Evenements</p>
            </div>
            <div className="flex-1 bg-badge rounded-xl p-4 text-center">
              <p className="font-bold text-2xl text-primary">{orga.total_participants}</p>
              <p className="text-xs text-muted mt-1">Participants</p>
            </div>
          </div>

          {/* Description */}
          {orga.description && (
            <div className="mb-8">
              <h2 className="font-semibold text-lg text-primary mb-3">
                A propos
              </h2>
              <p className="text-muted leading-relaxed whitespace-pre-wrap break-words hyphens-auto">
                {orga.description}
              </p>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="mb-8">
            <h2 className="font-semibold text-lg text-primary mb-4">
              Evenements a venir ({upcomingEvents.length})
            </h2>

            {upcomingEvents.length === 0 ? (
              <div className="bg-badge rounded-xl p-8 text-center">
                <CalendarDays className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-muted">Aucun evenement a venir</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingEvents.map(renderEventCard)}
              </div>
            )}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg text-primary mb-4">
                Evenements passes ({pastEvents.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4 opacity-70">
                {pastEvents.map(renderEventCard)}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation userType={userType} />
    </div>
  );
}
