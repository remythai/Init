"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Send,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { authService } from "../../../services/auth.service";
import { eventService, EventStatistics } from "../../../services/event.service";

export default function StatisticsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [eventName, setEventName] = useState("");
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      if (validatedType !== "orga") {
        router.push("/events");
        return;
      }

      loadData();
    };

    initPage();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load event info
      const eventResponse = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEventName(eventData.data?.name || "");
        setHasWhitelist(eventData.data?.has_whitelist || false);
      }

      // Load statistics
      const statistics = await eventService.getEventStatistics(eventId);
      setStats(statistics);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
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
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-poppins text-2xl font-bold text-[#303030] flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-[#1271FF]" />
                Statistiques
              </h1>
              {eventName && (
                <p className="text-gray-600 mt-1">{eventName}</p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#303030] rounded-full shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {stats && (
            <div className="space-y-8">
              {/* Section: Participants */}
              <section>
                <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1271FF]" />
                  Participants
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total participants"
                    value={stats.participants.total}
                    color="blue"
                  />
                  <StatCard
                    icon={<Zap className="w-6 h-6" />}
                    label="Utilisateurs actifs"
                    value={stats.participants.active}
                    subtitle="Ont swipé ou envoyé un message"
                    color="green"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Taux d'engagement"
                    value={`${stats.participants.engagement_rate}%`}
                    color="purple"
                    progress={stats.participants.engagement_rate}
                  />
                </div>
              </section>

              {/* Section: Whitelist (if enabled) */}
              {hasWhitelist && (
                <section>
                  <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#1271FF]" />
                    Whitelist
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={<Users className="w-6 h-6" />}
                      label="Total whitelist"
                      value={stats.whitelist.total}
                      color="gray"
                    />
                    <StatCard
                      icon={<UserCheck className="w-6 h-6" />}
                      label="Inscrits"
                      value={stats.whitelist.registered}
                      color="green"
                    />
                    <StatCard
                      icon={<UserX className="w-6 h-6" />}
                      label="En attente"
                      value={stats.whitelist.pending}
                      color="orange"
                    />
                    <StatCard
                      icon={<TrendingUp className="w-6 h-6" />}
                      label="Taux de conversion"
                      value={`${stats.whitelist.conversion_rate}%`}
                      color="blue"
                      progress={stats.whitelist.conversion_rate}
                    />
                  </div>
                </section>
              )}

              {/* Section: Swipes */}
              <section>
                <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#1271FF]" />
                  Activité de swipe
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Zap className="w-6 h-6" />}
                    label="Total swipes"
                    value={stats.swipes.total}
                    color="gray"
                  />
                  <StatCard
                    icon={<ThumbsUp className="w-6 h-6" />}
                    label="Likes"
                    value={stats.swipes.likes}
                    color="green"
                  />
                  <StatCard
                    icon={<ThumbsDown className="w-6 h-6" />}
                    label="Passes"
                    value={stats.swipes.passes}
                    color="red"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Taux de like"
                    value={`${stats.swipes.like_rate}%`}
                    color="pink"
                    progress={stats.swipes.like_rate}
                  />
                </div>
                <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Répartition likes/passes</span>
                    <span className="text-gray-500">
                      {stats.swipes.users_who_swiped} utilisateurs ont swipé
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    {stats.swipes.total > 0 && (
                      <>
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${stats.swipes.like_rate}%` }}
                        />
                        <div
                          className="h-full bg-red-400 transition-all"
                          style={{ width: `${100 - stats.swipes.like_rate}%` }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Likes ({stats.swipes.likes})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                      Passes ({stats.swipes.passes})
                    </span>
                  </div>
                </div>
              </section>

              {/* Section: Matchs */}
              <section>
                <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Matchs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={<Heart className="w-6 h-6" />}
                    label="Total matchs"
                    value={stats.matching.total_matches}
                    color="pink"
                    large
                  />
                  <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Matchs par utilisateur"
                    value={stats.matching.average_matches_per_user}
                    subtitle="En moyenne"
                    color="purple"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Taux de réciprocité"
                    value={`${stats.matching.reciprocity_rate}%`}
                    subtitle="Likes mutuels"
                    color="pink"
                    progress={stats.matching.reciprocity_rate}
                  />
                </div>
              </section>

              {/* Section: Messages */}
              <section>
                <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#1271FF]" />
                  Messages
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    icon={<MessageCircle className="w-6 h-6" />}
                    label="Total messages"
                    value={stats.messages.total}
                    color="blue"
                    large
                  />
                  <StatCard
                    icon={<Send className="w-6 h-6" />}
                    label="Utilisateurs actifs"
                    value={stats.messages.users_who_sent}
                    subtitle="Ont envoyé au moins 1 message"
                    color="green"
                  />
                  <StatCard
                    icon={<MessageCircle className="w-6 h-6" />}
                    label="Conversations actives"
                    value={stats.messages.conversations_active}
                    subtitle="Avec au moins 1 message"
                    color="purple"
                  />
                  <StatCard
                    icon={<BarChart3 className="w-6 h-6" />}
                    label="Messages par match"
                    value={stats.messages.average_per_conversation}
                    subtitle="En moyenne"
                    color="orange"
                  />
                </div>
              </section>

              {/* Summary Card */}
              <section className="bg-gradient-to-br from-[#1271FF] to-[#0d5dd8] rounded-2xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-4">Résumé de l'événement</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.participants.total}</p>
                    <p className="text-white/70 text-sm">Participants</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.matching.total_matches}</p>
                    <p className="text-white/70 text-sm">Matchs créés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.messages.total}</p>
                    <p className="text-white/70 text-sm">Messages échangés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">{stats.participants.engagement_rate}%</p>
                    <p className="text-white/70 text-sm">Engagement</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle?: string;
  color: "blue" | "green" | "red" | "orange" | "purple" | "pink" | "gray";
  progress?: number;
  large?: boolean;
}

function StatCard({ icon, label, value, subtitle, color, progress, large }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    pink: "bg-pink-100 text-pink-600",
    gray: "bg-gray-100 text-gray-600",
  };

  const progressColors = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    gray: "bg-gray-500",
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className={`font-bold text-[#303030] ${large ? "text-3xl" : "text-2xl"}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColors[color]}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
