"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Copy, Check, Link as LinkIcon, Share2, QrCode, Trash2 } from "lucide-react";
import { authService } from "../../../services/auth.service";
import { eventService, EventResponse } from "../../../services/event.service";

export default function EventSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const eventUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${eventId}`
    : "";

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

      loadEvent();
    };

    initPage();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Evenement non trouve");
      const data = await response.json();
      setEvent(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur copie:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.name || "Evenement",
          text: `Decouvrez cet evenement: ${event?.name}`,
          url: eventUrl,
        });
      } catch (err) {
        console.error("Erreur partage:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventService.deleteEvent(eventId);
      router.push("/events");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(message);
      setDeleting(false);
    }
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
        <div className="max-w-2xl mx-auto">
          <h1 className="font-poppins text-2xl font-bold text-[#303030] mb-2">
            Parametres
          </h1>
          {event && (
            <p className="text-gray-600 mb-6">{event.name}</p>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Share Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-lg text-[#303030] mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#1271FF]" />
              Partager l'evenement
            </h2>

            <div className="space-y-4">
              {/* Event Link */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Lien de l'evenement
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
                    <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-[#303030] truncate">{eventUrl}</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-2 ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-[#1271FF] text-white hover:bg-[#0d5dd8]"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copie !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-xl text-[#303030] font-medium hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Partager
              </button>

              {/* QR Code placeholder */}
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  Generateur de QR Code - Bientot disponible
                </p>
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-lg text-[#303030] mb-4">
              Informations
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Evenement public</span>
                <span className="font-medium text-[#303030]">
                  {event?.is_public ? "Oui" : "Non"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Liste blanche</span>
                <span className="font-medium text-[#303030]">
                  {event?.has_whitelist ? "Active" : "Desactive"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Acces par lien</span>
                <span className="font-medium text-[#303030]">
                  {event?.has_link_access ? "Active" : "Desactive"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Acces par mot de passe</span>
                <span className="font-medium text-[#303030]">
                  {event?.has_password_access ? "Active" : "Desactive"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Participants max</span>
                <span className="font-medium text-[#303030]">
                  {event?.max_participants || "-"}
                </span>
              </div>
            </div>

            <Link
              href={`/events/${eventId}/edit`}
              className="mt-4 w-full flex items-center justify-center py-3 bg-[#1271FF] text-white rounded-xl font-medium hover:bg-[#0d5dd8] transition-colors"
            >
              Modifier les parametres
            </Link>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-red-100">
            <h2 className="font-semibold text-lg text-red-500 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zone de danger
            </h2>

            <p className="text-gray-600 text-sm mb-4">
              La suppression de l'evenement est irreversible. Tous les participants seront deinscrits.
            </p>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 border-2 border-red-500 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
            >
              Supprimer l'evenement
            </button>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-md mx-4 w-full">
            <h3 className="font-poppins text-xl font-semibold text-[#303030] mb-2">
              Supprimer l'evenement ?
            </h3>
            <p className="text-gray-600 mb-6">
              Cette action est irreversible. Tous les participants seront deinscrits et l'evenement sera definitivement supprime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
