"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Users, Search, Mail, Phone, Calendar, UserX } from "lucide-react";
import { authService } from "../../../services/auth.service";

interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  mail?: string;
  tel?: string;
  registered_at?: string;
  profil_info?: Record<string, unknown>;
}

export default function ParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      }

      // Load participants
      const response = await authService.authenticatedFetch(`/api/events/${eventId}/participants`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors du chargement des participants");
      }

      const data = await response.json();
      setParticipants(data.data?.participants || data.participants || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm("Etes-vous sur de vouloir retirer ce participant ?")) return;

    try {
      const response = await authService.authenticatedFetch(
        `/api/events/${eventId}/participants/${participantId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      setParticipants(participants.filter((p) => p.id !== participantId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur";
      alert(message);
    }
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

          {/* Search */}
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

          {/* Participants List */}
          {filteredParticipants.length === 0 ? (
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
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {participant.firstname.charAt(0).toUpperCase()}
                      </span>
                    </div>
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
                        {participant.tel && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {participant.tel}
                          </span>
                        )}
                        {participant.registered_at && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-3 h-3" />
                            Inscrit le {new Date(participant.registered_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(participant.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Retirer le participant"
                  >
                    <UserX className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
