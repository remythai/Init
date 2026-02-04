"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
  Image as ImageIcon,
  User,
  ChevronRight,
  Ban,
  Filter,
} from "lucide-react";
import { authService } from "../../../services/auth.service";
import {
  reportService,
  Report,
  ReportStats,
  ReportDetails,
  ReportStatus,
} from "../../../services/report.service";
import { eventService } from "../../../services/event.service";

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventName, setEventName] = useState("");
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [orgaNotes, setOrgaNotes] = useState("");

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

      // Load event info
      const eventResponse = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEventName(eventData.data?.name || "");
      }

      // Load reports
      const data = await reportService.getReports(
        eventId,
        statusFilter === "all" ? undefined : statusFilter
      );
      setStats(data.stats);
      setReports(data.reports);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [statusFilter]);

  const openReportDetails = async (reportId: number) => {
    setLoadingDetails(true);
    try {
      const details = await reportService.getReportDetails(eventId, reportId);
      setSelectedReport(details);
      setOrgaNotes(details.orga_notes || "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateReportStatus = async (status: ReportStatus) => {
    if (!selectedReport) return;

    setUpdating(true);
    try {
      await reportService.updateReport(eventId, selectedReport.id, {
        status,
        orga_notes: orgaNotes || undefined,
      });
      setSelectedReport(null);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedReport || updating) return;

    if (!confirm(`Bloquer ${selectedReport.reported_user.firstname} ${selectedReport.reported_user.lastname} de cet evenement ?`)) {
      return;
    }

    setUpdating(true);
    try {
      await eventService.blockUser(eventId, selectedReport.reported_user.id, "Suite a signalement");
      await reportService.updateReport(eventId, selectedReport.id, { status: "resolved" });
      setSelectedReport(null);
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du blocage";
      alert(message);
      console.error("Block user error:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <ImageIcon className="w-4 h-4" />;
      case "profile":
        return <User className="w-4 h-4" />;
      case "message":
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusBadgeClass = (status: ReportStatus) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700";
      case "resolved":
        return "bg-red-100 text-red-700";
      case "dismissed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    switch (status) {
      case "pending":
        return "A traiter";
      case "resolved":
        return "Bloque";
      case "dismissed":
        return "Ignore";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des signalements...</p>
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
              className="h-8 md:h-12 w-auto"
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
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="mb-6">
            <h1 className="font-poppins text-2xl font-bold text-[#303030] flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              Signalements
            </h1>
            {eventName && <p className="text-gray-600 mt-1">{eventName}</p>}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-orange-50 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-sm text-orange-600">A traiter</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-red-600">{stats.resolved}</div>
                <div className="text-sm text-red-600">Bloques</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-600">{stats.dismissed}</div>
                <div className="text-sm text-gray-600">Ignores</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-bold text-[#303030]">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReportStatus | "all")}
              className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-[#303030] focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
            >
              <option value="all">Tous</option>
              <option value="pending">A traiter</option>
              <option value="resolved">Bloques</option>
              <option value="dismissed">Ignores</option>
            </select>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucun signalement</p>
              <p className="text-gray-400 text-sm mt-2">
                Les signalements des utilisateurs apparaitront ici
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => openReportDetails(report.id)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      report.report_type === 'photo' ? 'bg-purple-100 text-purple-600' :
                      report.report_type === 'profile' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {getTypeIcon(report.report_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#303030]">
                          {report.reported_user.firstname} {report.reported_user.lastname}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(report.status)}`}>
                          {getStatusLabel(report.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {reportService.getTypeLabel(report.report_type)} - {reportService.getReasonLabel(report.reason)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Signale par {report.reporter.firstname} {report.reporter.lastname} - {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Report Details Modal */}
      {(selectedReport || loadingDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !updating && setSelectedReport(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl mx-4 w-full max-h-[90vh] overflow-hidden flex flex-col">
            {loadingDetails ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : selectedReport && (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                        Signalement #{selectedReport.id}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {reportService.getTypeLabel(selectedReport.report_type)} - {reportService.getReasonLabel(selectedReport.reason)}
                      </p>
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadgeClass(selectedReport.status)}`}>
                      {getStatusLabel(selectedReport.status)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {/* Users info */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">Signale par</div>
                      <div className="font-medium text-[#303030]">
                        {selectedReport.reporter.firstname} {selectedReport.reporter.lastname}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                      <div className="text-sm text-red-600 mb-1">Utilisateur signale</div>
                      <div className="font-medium text-red-700">
                        {selectedReport.reported_user.firstname} {selectedReport.reported_user.lastname}
                      </div>
                      {selectedReport.reported_user.total_reports && selectedReport.reported_user.total_reports > 1 && (
                        <div className="text-xs text-red-500 mt-1">
                          {selectedReport.reported_user.total_reports} signalements au total
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {selectedReport.description && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">Description</div>
                      <div className="bg-gray-50 rounded-xl p-4 text-gray-600">
                        {selectedReport.description}
                      </div>
                    </div>
                  )}

                  {/* Photos (if photo report) */}
                  {selectedReport.photos && selectedReport.photos.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Photos signalees ({selectedReport.photos.length})
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedReport.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className={`relative aspect-square rounded-xl overflow-hidden ${
                              photo.is_primary ? 'ring-2 ring-red-500' : ''
                            }`}
                          >
                            <img
                              src={photo.file_path}
                              alt="Photo signalee"
                              className="w-full h-full object-cover"
                            />
                            {photo.is_primary && (
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 rounded">
                                Principal
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Profile info (if profile report) */}
                  {selectedReport.profile_info && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Informations du profil signale
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Nom</span>
                          <span className="text-[#303030] font-medium">
                            {selectedReport.profile_info.firstname} {selectedReport.profile_info.lastname}
                          </span>
                        </div>
                        {selectedReport.profile_info.birthday && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Date de naissance</span>
                            <span className="text-[#303030]">
                              {new Date(selectedReport.profile_info.birthday).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                        {selectedReport.profile_info.custom_fields && Object.entries(selectedReport.profile_info.custom_fields).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-[#303030]">
                              {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages (if message report) */}
                  {selectedReport.messages && selectedReport.messages.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Conversation ({selectedReport.messages.length} messages)
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
                        {selectedReport.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.sender_id === selectedReport.reported_user.id
                                ? "items-end"
                                : "items-start"
                            }`}
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              {msg.sender_name} - {new Date(msg.sent_at).toLocaleString('fr-FR')}
                            </div>
                            <div
                              className={`px-3 py-2 rounded-xl max-w-[80%] ${
                                msg.sender_id === selectedReport.reported_user.id
                                  ? "bg-red-100 text-red-800"
                                  : "bg-white text-gray-700 border border-gray-200"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orga Notes */}
                  <div className="mb-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Notes organisateur</div>
                    <textarea
                      value={orgaNotes}
                      onChange={(e) => setOrgaNotes(e.target.value)}
                      placeholder="Ajoutez des notes sur ce signalement..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030] resize-none h-24 break-words"
                      style={{ wordBreak: 'break-word' }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  {selectedReport.status === 'pending' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedReport(null)}
                        disabled={updating}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Fermer
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => updateReportStatus('dismissed')}
                        disabled={updating}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={handleBlockUser}
                        disabled={updating}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        Bloquer l&apos;utilisateur
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`text-sm px-3 py-1 rounded-full ${
                        selectedReport.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedReport.status === 'resolved' ? 'Utilisateur bloque' : 'Signalement ignore'}
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
