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
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
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
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  const exportToCSV = () => {
    if (!stats) return;

    const date = new Date().toLocaleDateString("fr-FR");
    const rows: string[][] = [];

    // Header
    rows.push(["Statistiques de l'événement", eventName]);
    rows.push(["Date d'export", date]);
    rows.push([]);

    // Participants
    rows.push(["=== PARTICIPANTS ==="]);
    rows.push(["Total participants", stats.participants.total.toString()]);
    rows.push(["Utilisateurs actifs", stats.participants.active.toString()]);
    rows.push(["Taux d'engagement", `${stats.participants.engagement_rate}%`]);
    rows.push([]);

    // Whitelist (if enabled)
    if (hasWhitelist) {
      rows.push(["=== WHITELIST ==="]);
      rows.push(["Total whitelist", stats.whitelist.total.toString()]);
      rows.push(["Inscrits", stats.whitelist.registered.toString()]);
      rows.push(["En attente", stats.whitelist.pending.toString()]);
      rows.push(["Taux de conversion", `${stats.whitelist.conversion_rate}%`]);
      rows.push([]);
    }

    // Swipes
    rows.push(["=== ACTIVITE DE SWIPE ==="]);
    rows.push(["Total swipes", stats.swipes.total.toString()]);
    rows.push(["Likes", stats.swipes.likes.toString()]);
    rows.push(["Passes", stats.swipes.passes.toString()]);
    rows.push(["Taux de like", `${stats.swipes.like_rate}%`]);
    rows.push(["Utilisateurs ayant swipé", stats.swipes.users_who_swiped.toString()]);
    rows.push([]);

    // Matchs
    rows.push(["=== MATCHS ==="]);
    rows.push(["Total matchs", stats.matching.total_matches.toString()]);
    rows.push(["Matchs par utilisateur (moyenne)", stats.matching.average_matches_per_user.toString()]);
    rows.push(["Taux de réciprocité", `${stats.matching.reciprocity_rate}%`]);
    rows.push([]);

    // Messages
    rows.push(["=== MESSAGES ==="]);
    rows.push(["Total messages", stats.messages.total.toString()]);
    rows.push(["Utilisateurs ayant envoyé un message", stats.messages.users_who_sent.toString()]);
    rows.push(["Conversations actives", stats.messages.conversations_active.toString()]);
    rows.push(["Messages par conversation (moyenne)", stats.messages.average_per_conversation.toString()]);

    // Convert to CSV
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statistiques_${eventName.replace(/[^a-z0-9]/gi, "_")}_${date.replace(/\//g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    setShowExportMenu(false);
    // Small delay to ensure menu is closed before print dialog opens
    setTimeout(() => {
      window.print();
    }, 100);
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
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header {
            display: none !important;
          }
          main {
            padding-top: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .bg-gradient-to-br {
            background: #1271FF !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030] border-b border-white/10 print:static print:bg-white print:border-b-2 print:border-gray-200">
        <div className="max-w-7xl mx-auto px-3 md:px-8 py-2 md:py-3 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-8 md:h-12 w-auto"
            />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-xs md:text-sm transition-colors flex items-center gap-1 md:gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 border-b-2 border-[#1271FF] pb-4">
        <div className="flex items-center justify-between mb-4">
          <Image
            src="/initLogoGray.png"
            alt="Init Logo"
            width={120}
            height={48}
            className="h-10 w-auto"
          />
          <p className="text-sm text-gray-500">
            Exporté le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-[#1271FF]" />
          <div>
            <h1 className="text-2xl font-bold text-[#303030]">Statistiques</h1>
            {eventName && (
              <p className="text-lg text-[#303030]">{eventName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-28 pb-8 px-4 md:px-8 print:pt-0 print:px-0">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-8 print:hidden">
            <div>
              <h1 className="font-poppins text-2xl font-bold text-[#303030] flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-[#1271FF]" />
                Statistiques
              </h1>
              {eventName && (
                <p className="text-gray-600 mt-1">{eventName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#303030] rounded-full shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>

              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1271FF] text-white rounded-full shadow-sm hover:bg-[#0d5dd8] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exporter</span>
                </button>
                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        onClick={exportToCSV}
                        className="w-full px-4 py-2 text-left text-[#303030] hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Excel / CSV</p>
                          <p className="text-xs text-gray-500">Tableur</p>
                        </div>
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="w-full px-4 py-2 text-left text-[#303030] hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileText className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium">PDF</p>
                          <p className="text-xs text-gray-500">Rapport visuel</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
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
                    label="Taux d&apos;engagement"
                    value={`${stats.participants.engagement_rate}%`}
                    color="purple"
                    progress={stats.participants.engagement_rate}
                  />
                </div>
                {/* Engagement Chart */}
                {stats.participants.total > 0 && (
                  <div className="mt-4 bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Actifs", value: stats.participants.active },
                                { name: "Inactifs", value: stats.participants.total - stats.participants.active },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              <Cell fill="#22c55e" />
                              <Cell fill="#d1d5db" />
                            </Pie>
                            <Tooltip
                              formatter={(value) => [value ?? 0, ""]}
                              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-sm font-semibold text-[#303030] mb-3">Répartition de l&apos;engagement</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            <span className="text-sm text-[#303030]">Actifs</span>
                            <span className="font-semibold text-[#303030]">{stats.participants.active} ({stats.participants.engagement_rate}%)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                            <span className="text-sm text-[#303030]">Inactifs</span>
                            <span className="font-semibold text-[#303030]">{stats.participants.total - stats.participants.active} ({100 - stats.participants.engagement_rate}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  {/* Whitelist Conversion Chart */}
                  {stats.whitelist.total > 0 && (
                    <div className="mt-4 bg-white rounded-xl p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                        <div className="w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: "Inscrits", value: stats.whitelist.registered },
                                  { name: "En attente", value: stats.whitelist.pending },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                <Cell fill="#22c55e" />
                                <Cell fill="#f97316" />
                              </Pie>
                              <Tooltip
                                formatter={(value) => [value ?? 0, ""]}
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-center md:text-left">
                          <p className="text-sm font-semibold text-[#303030] mb-3">Conversion des invitations</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-green-500"></span>
                              <span className="text-sm text-[#303030]">Inscrits</span>
                              <span className="font-semibold text-[#303030]">{stats.whitelist.registered} ({stats.whitelist.conversion_rate}%)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                              <span className="text-sm text-[#303030]">En attente</span>
                              <span className="font-semibold text-[#303030]">{stats.whitelist.pending} ({100 - stats.whitelist.conversion_rate}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                {/* Reciprocity Gauge */}
                {stats.swipes.likes > 0 && (
                  <div className="mt-4 bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                      <div className="flex-shrink-0">
                        <GaugeChart value={stats.matching.reciprocity_rate} color="#ec4899" />
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-sm font-semibold text-[#303030] mb-1">Taux de réciprocité</p>
                        <p className="text-xs text-gray-500 mb-3">Proportion de likes ayant abouti à un match</p>
                        <p className="text-2xl font-bold text-pink-500">{stats.matching.total_matches} matchs</p>
                        <p className="text-sm text-[#303030]">sur {stats.swipes.likes} likes envoyés</p>
                      </div>
                    </div>
                  </div>
                )}
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

              {/* Section: Parcours utilisateur */}
              <section>
                <h2 className="text-lg font-semibold text-[#303030] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#1271FF]" />
                  Parcours utilisateur
                </h2>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <p className="text-[#303030] text-sm mb-4">Progression des utilisateurs à travers les différentes étapes</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Participants",
                            value: stats.participants.total,
                          },
                          {
                            name: "Actifs",
                            value: stats.participants.active,
                          },
                          {
                            name: "Ont swipé",
                            value: stats.swipes.users_who_swiped,
                          },
                          {
                            name: "Avec un match",
                            value: Math.min(stats.matching.total_matches * 2, stats.participants.total),
                          },
                          {
                            name: "Ont écrit",
                            value: stats.messages.users_who_sent,
                          },
                        ]}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <XAxis type="number" stroke="#303030" />
                        <YAxis type="category" dataKey="name" width={100} stroke="#303030" />
                        <Tooltip
                          formatter={(value) => [value ?? 0, "Utilisateurs"]}
                          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {[
                            { fill: "#1271FF" },
                            { fill: "#22c55e" },
                            { fill: "#8b5cf6" },
                            { fill: "#ec4899" },
                            { fill: "#f97316" },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Summary Card */}
              <section className="bg-gradient-to-br from-[#1271FF] to-[#0d5dd8] rounded-2xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-4">Résumé de l&apos;événement</h2>
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
    </>
  );
}

// Gauge Chart Component
interface GaugeChartProps {
  value: number;
  color: string;
}

function GaugeChart({ value, color }: GaugeChartProps) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  // Semi-circle calculations
  const circumference = Math.PI * radius;
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        {/* Background arc */}
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 20 100 A ${radius} ${radius} 0 0 1 180 100`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        {/* Center text */}
        <text
          x="100"
          y="90"
          textAnchor="middle"
          className="text-3xl font-bold"
          fill="#303030"
          fontSize="32"
          fontWeight="bold"
        >
          {normalizedValue}%
        </text>
      </svg>
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
