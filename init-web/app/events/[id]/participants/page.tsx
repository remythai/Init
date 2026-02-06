"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Search, Mail, Phone, Calendar, UserX, X, ChevronRight, Shield, AlertTriangle, UserCheck, Ban, Trash2, Lock } from "lucide-react";
import { authService } from "../../../services/auth.service";
import { CustomField, getFieldId, eventService, BlockedUser } from "../../../services/event.service";
import { photoService } from "../../../services/photo.service";
import { whitelistService } from "../../../services/whitelist.service";

interface ParticipantPhoto {
  id: number;
  file_path: string;
  is_primary?: boolean;
}

interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  mail?: string;
  tel?: string;
  registered_at?: string;
  profil_info?: Record<string, unknown>;
  photos?: ParticipantPhoto[];
}

export default function ParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventName, setEventName] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Remove modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<Participant | null>(null);
  const [removeAction, setRemoveAction] = useState<"block" | "delete">("block");
  const [removeFromWhitelist, setRemoveFromWhitelist] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Blocked users state
  const [activeTab, setActiveTab] = useState<"participants" | "blocked">("participants");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblocking, setUnblocking] = useState<number | null>(null);

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

      loadParticipants();
    };

    initPage();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);

      // Load event info
      const eventResponse = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEventName(eventData.data?.name || "");
        setCustomFields(eventData.data?.custom_fields || []);
        setHasWhitelist(eventData.data?.has_whitelist || false);
      }

      // Load participants
      const response = await authService.authenticatedFetch(`/api/events/${eventId}/participants`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors du chargement des participants");
      }

      const data = await response.json();
      setParticipants(data.data || []);

      // Load blocked users
      loadBlockedUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      const blocked = await eventService.getBlockedUsers(eventId);
      setBlockedUsers(blocked);
    } catch {
      // Silently ignore - blocked users are optional
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblockUser = async (userId: number) => {
    try {
      setUnblocking(userId);
      await eventService.unblockUser(eventId, userId);
      setBlockedUsers(blockedUsers.filter((u) => u.user_id !== userId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    } finally {
      setUnblocking(null);
    }
  };

  const openRemoveModal = (participant: Participant, e: React.MouseEvent) => {
    e.stopPropagation();
    setParticipantToRemove(participant);
    setRemoveAction("block");
    setRemoveFromWhitelist(false);
    setShowRemoveModal(true);
  };

  const handleRemoveParticipant = async () => {
    if (!participantToRemove) return;

    try {
      setRemoving(true);

      // Remove from event with specified action
      await eventService.removeParticipant(eventId, participantToRemove.id, removeAction);

      // Also remove from whitelist if requested and participant has a phone
      if (removeFromWhitelist && hasWhitelist && participantToRemove.tel) {
        try {
          await whitelistService.removePhone(eventId, participantToRemove.tel, false);
        } catch {
          // Silently ignore if not in whitelist
        }
      }

      setParticipants(participants.filter((p) => p.id !== participantToRemove.id));
      if (selectedParticipant?.id === participantToRemove.id) {
        setSelectedParticipant(null);
      }

      // If blocked, refresh blocked list
      if (removeAction === "block") {
        loadBlockedUsers();
      }

      setShowRemoveModal(false);
      setParticipantToRemove(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    } finally {
      setRemoving(false);
    }
  };

  const getFieldLabel = (fieldId: string): string => {
    const field = customFields.find((f) => getFieldId(f.label) === fieldId);
    return field?.label || fieldId;
  };

  const formatProfilValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const hasProfilInfo = (participant: Participant): boolean => {
    return !!(participant.profil_info && Object.keys(participant.profil_info).length > 0);
  };

  const getPrimaryPhoto = (participant: Participant): ParticipantPhoto | null => {
    if (!participant.photos || participant.photos.length === 0) return null;
    return participant.photos.find(p => p.is_primary) || participant.photos[0];
  };

  const hasPhotos = (participant: Participant): boolean => {
    return !!(participant.photos && participant.photos.length > 0);
  };

  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setSelectedPhotoIndex(0);
  };

  const filteredParticipants = participants.filter((p) => {
    const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030] border-b border-white/10">
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

      {/* Main Content */}
      <main className="pt-28 pb-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-poppins text-2xl font-bold text-[#303030]">
                Participants
              </h1>
              {eventName && (
                <p className="text-gray-600 mt-1">{eventName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Users className="w-5 h-5 text-[#1271FF]" />
              <span className="font-semibold text-[#303030]">{participants.length}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("participants")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                activeTab === "participants"
                  ? "bg-[#1271FF] text-white"
                  : "bg-white text-[#303030] hover:bg-gray-100"
              }`}
            >
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </button>
            {blockedUsers.length > 0 && (
              <button
                onClick={() => setActiveTab("blocked")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  activeTab === "blocked"
                    ? "bg-red-500 text-white"
                    : "bg-white text-red-500 hover:bg-red-50"
                }`}
              >
                <Ban className="w-4 h-4" />
                Bloqués ({blockedUsers.length})
              </button>
            )}
          </div>

          {/* Search */}
          {activeTab === "participants" && (
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-full border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030] placeholder-gray-400"
              />
            </div>
          )}

          {/* Blocked Users List */}
          {activeTab === "blocked" && (
            <div className="space-y-3">
              {loadingBlocked ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                  <Ban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Aucun utilisateur bloqué</p>
                </div>
              ) : (
                blockedUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Ban className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#303030]">
                          {user.firstname} {user.lastname}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {user.mail && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="w-3 h-3" />
                              {user.mail}
                            </span>
                          )}
                          {user.blocked_at && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              Bloqué le {new Date(user.blocked_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                        {user.reason && (
                          <p className="text-sm text-red-600 mt-1">{user.reason}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(user.user_id)}
                      disabled={unblocking === user.user_id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      {unblocking === user.user_id ? "..." : "Débloquer"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Participants List */}
          {activeTab === "participants" && (
            filteredParticipants.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  {searchQuery
                    ? "Aucun participant ne correspond a votre recherche"
                    : "Aucun participant inscrit"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  onClick={() => handleSelectParticipant(participant)}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {getPrimaryPhoto(participant) ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={photoService.getPhotoUrl(getPrimaryPhoto(participant)!.file_path)}
                          alt={`${participant.firstname} ${participant.lastname}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {participant.firstname.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#303030]">
                        {participant.firstname} {participant.lastname}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {participant.mail && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {participant.mail}
                          </span>
                        )}
                        {participant.registered_at && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(participant.registered_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasProfilInfo(participant) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Profil
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedParticipant(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-lg mx-4 w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {getPrimaryPhoto(selectedParticipant) ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={photoService.getPhotoUrl(getPrimaryPhoto(selectedParticipant)!.file_path)}
                      alt={`${selectedParticipant.firstname} ${selectedParticipant.lastname}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-[#1271FF] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xl">
                      {selectedParticipant.firstname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                    {selectedParticipant.firstname} {selectedParticipant.lastname}
                  </h2>
                  {selectedParticipant.registered_at && (
                    <p className="text-sm text-gray-600">
                      Inscrit le {new Date(selectedParticipant.registered_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 space-y-4">
              {/* Photos Gallery */}
              {hasPhotos(selectedParticipant) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#303030]">Photos</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    {/* Main Photo */}
                    <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3">
                      <img
                        src={photoService.getPhotoUrl(selectedParticipant.photos![selectedPhotoIndex]?.file_path)}
                        alt={`Photo ${selectedPhotoIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Thumbnails */}
                    {selectedParticipant.photos!.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedParticipant.photos!.map((photo, index) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhotoIndex(index)}
                            className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                              index === selectedPhotoIndex
                                ? "border-[#1271FF]"
                                : "border-transparent hover:border-gray-300"
                            }`}
                          >
                            <img
                              src={photoService.getPhotoUrl(photo.file_path)}
                              alt={`Miniature ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-[#303030]">Contact</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  {selectedParticipant.mail && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a href={`mailto:${selectedParticipant.mail}`} className="text-[#1271FF] hover:underline">
                        {selectedParticipant.mail}
                      </a>
                    </div>
                  )}
                  {selectedParticipant.tel && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a href={`tel:${selectedParticipant.tel}`} className="text-[#1271FF] hover:underline">
                        {selectedParticipant.tel}
                      </a>
                    </div>
                  )}
                  {!selectedParticipant.mail && !selectedParticipant.tel && (
                    <p className="text-gray-500 text-sm">Aucune information de contact</p>
                  )}
                </div>
              </div>

              {/* Profil Info (Custom Fields) */}
              {hasProfilInfo(selectedParticipant) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#303030]">Informations du profil</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {Object.entries(selectedParticipant.profil_info || {}).map(([key, value]) => (
                      <div key={key} className="overflow-hidden">
                        <p className="text-sm text-gray-500">{getFieldLabel(key)}</p>
                        <p className="text-[#303030] whitespace-pre-wrap break-words hyphens-auto">{formatProfilValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasProfilInfo(selectedParticipant) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 text-sm text-center">
                    Aucune information de profil supplementaire
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedParticipant(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={(e) => openRemoveModal(selectedParticipant, e)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-red-500 text-red-500 font-medium hover:bg-red-50 transition-colors"
              >
                <UserX className="w-5 h-5" />
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Participant Modal */}
      {showRemoveModal && participantToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !removing && setShowRemoveModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="font-poppins text-lg font-semibold text-[#303030]">
                  Retirer le participant
                </h2>
                <p className="text-sm text-gray-600">
                  {participantToRemove.firstname} {participantToRemove.lastname}
                </p>
              </div>
            </div>

            {/* Action choice */}
            <div className="space-y-3 mb-4">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  removeAction === "block"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="removeAction"
                  value="block"
                  checked={removeAction === "block"}
                  onChange={() => setRemoveAction("block")}
                  className="w-5 h-5 mt-0.5 text-orange-500 focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-[#303030]">
                    <Lock className="w-4 h-4 text-orange-500" />
                    Bloquer
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Bloque l'accès à l'événement. Les données (profil, matchs, conversations) sont conservées mais en lecture seule.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  removeAction === "delete"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="removeAction"
                  value="delete"
                  checked={removeAction === "delete"}
                  onChange={() => setRemoveAction("delete")}
                  className="w-5 h-5 mt-0.5 text-red-500 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-[#303030]">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Supprimer définitivement
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Supprime toutes les données : profil, matchs, messages et swipes. Comme s'il n'avait jamais participé.
                  </p>
                </div>
              </label>
            </div>

            {hasWhitelist && participantToRemove.tel && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeFromWhitelist}
                    onChange={(e) => setRemoveFromWhitelist(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#1271FF] focus:ring-[#1271FF]"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium text-[#303030]">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Retirer aussi de la whitelist
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Ce participant ne pourra plus se réinscrire à l'événement
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveModal(false)}
                disabled={removing}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[#303030] font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRemoveParticipant}
                disabled={removing}
                className={`flex-1 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50 ${
                  removeAction === "delete"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {removing ? "En cours..." : removeAction === "delete" ? "Supprimer" : "Bloquer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
