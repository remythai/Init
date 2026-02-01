"use client";

import { useState, useEffect, useRef } from "react";
import { Photo, photoService } from "../services/photo.service";
import {
  Plus,
  Trash2,
  Star,
  ChevronUp,
  ChevronDown,
  X,
  Copy,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PhotoManagerProps {
  eventId?: string;
  maxPhotos?: number;
  showCopyFromGeneral?: boolean;
  onPhotosChange?: (photos: Photo[]) => void;
  darkMode?: boolean;
}

export default function PhotoManager({
  eventId,
  maxPhotos = 6,
  showCopyFromGeneral = false,
  onPhotosChange,
  darkMode = false,
}: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [generalPhotos, setGeneralPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteModalPhoto, setDeleteModalPhoto] = useState<Photo | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedToCopy, setSelectedToCopy] = useState<number[]>([]);
  const [copying, setCopying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await photoService.getPhotos(eventId);
      setPhotos(data);
      onPhotosChange?.(data);

      // Load general photos if we need copy functionality
      if (showCopyFromGeneral && eventId) {
        const general = await photoService.getPhotos();
        setGeneralPhotos(general);
      }
    } catch (err) {
      console.error("Error loading photos:", err);
      setError("Impossible de charger les photos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const newPhoto = await photoService.uploadPhoto(file, eventId);
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      onPhotosChange?.(updatedPhotos);
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    try {
      setError("");
      await photoService.deletePhoto(photo.id);
      const updatedPhotos = photos.filter((p) => p.id !== photo.id);
      setPhotos(updatedPhotos);
      onPhotosChange?.(updatedPhotos);
      setDeleteModalPhoto(null);
    } catch (err) {
      console.error("Error deleting photo:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleSetPrimary = async (photo: Photo) => {
    try {
      setError("");
      await photoService.setPrimaryPhoto(photo.id);
      // Reload to get updated primary status
      await loadPhotos();
    } catch (err) {
      console.error("Error setting primary:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  };

  const handleMove = async (photo: Photo, direction: "up" | "down") => {
    const index = photos.findIndex((p) => p.id === photo.id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === photos.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];

    try {
      setError("");
      const photoIds = newPhotos.map((p) => p.id);
      const reordered = await photoService.reorderPhotos(photoIds, eventId);
      setPhotos(reordered);
      onPhotosChange?.(reordered);
    } catch (err) {
      console.error("Error reordering:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la réorganisation");
    }
  };

  const handleCopyFromGeneral = async () => {
    if (!eventId || selectedToCopy.length === 0) return;

    try {
      setCopying(true);
      setError("");
      await photoService.copyPhotosToEvent(eventId, selectedToCopy);
      await loadPhotos();
      setShowCopyModal(false);
      setSelectedToCopy([]);
    } catch (err) {
      console.error("Error copying photos:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la copie");
    } finally {
      setCopying(false);
    }
  };

  const toggleCopySelection = (photoId: number) => {
    setSelectedToCopy((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Styles based on dark mode
  const cardBg = darkMode ? "bg-white/10" : "bg-gray-100";
  const textColor = darkMode ? "text-white" : "text-gray-900";
  const textMuted = darkMode ? "text-white/60" : "text-gray-500";
  const borderColor = darkMode ? "border-white/20" : "border-gray-200";
  const modalBg = darkMode ? "bg-[#1a1a2e]" : "bg-white";
  const hoverBg = darkMode ? "hover:bg-white/20" : "hover:bg-gray-200";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={`w-6 h-6 animate-spin ${textMuted}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError("")} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Copy from general button */}
      {showCopyFromGeneral && eventId && generalPhotos.length > 0 && (
        <button
          onClick={() => setShowCopyModal(true)}
          className={`flex items-center gap-2 px-4 py-2 ${cardBg} ${textColor} rounded-lg ${hoverBg} transition-colors`}
        >
          <Copy className="w-4 h-4" />
          <span>Copier depuis mon profil general</span>
        </button>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative aspect-square rounded-xl overflow-hidden ${cardBg} group`}
          >
            <img
              src={photoService.getPhotoUrl(photo.file_path)}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Primary badge */}
            {photo.is_primary && (
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                <Star className="w-3 h-3 fill-current" />
                <span>Principale</span>
              </div>
            )}

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {/* Set primary */}
              {!photo.is_primary && (
                <button
                  onClick={() => handleSetPrimary(photo)}
                  className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                  title="Definir comme principale"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}

              {/* Move up */}
              {index > 0 && (
                <button
                  onClick={() => handleMove(photo, "up")}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  title="Monter"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}

              {/* Move down */}
              {index < photos.length - 1 && (
                <button
                  onClick={() => handleMove(photo, "down")}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  title="Descendre"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => setDeleteModalPhoto(photo)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Add photo slot */}
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`aspect-square rounded-xl border-2 border-dashed ${borderColor} ${hoverBg} transition-colors flex flex-col items-center justify-center gap-2 ${textMuted} disabled:opacity-50`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Plus className="w-8 h-8" />
                <span className="text-sm">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo count */}
      <p className={`text-sm ${textMuted} text-center`}>
        {photos.length} / {maxPhotos} photos
      </p>

      {/* Delete confirmation modal */}
      {deleteModalPhoto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${modalBg} rounded-2xl p-6 max-w-sm w-full shadow-xl`}>
            <h3 className={`text-lg font-semibold ${textColor} mb-4`}>
              Supprimer cette photo ?
            </h3>
            <div className="aspect-video rounded-lg overflow-hidden mb-4">
              <img
                src={photoService.getPhotoUrl(deleteModalPhoto.file_path)}
                alt="Photo a supprimer"
                className="w-full h-full object-cover"
              />
            </div>
            <p className={`${textMuted} text-sm mb-6`}>
              Cette action est irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalPhoto(null)}
                className={`flex-1 py-3 ${cardBg} ${textColor} rounded-xl ${hoverBg} transition-colors`}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteModalPhoto)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy from general modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${modalBg} rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${textColor}`}>
                Copier depuis le profil general
              </h3>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setSelectedToCopy([]);
                }}
                className={textMuted}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generalPhotos.length === 0 ? (
              <p className={textMuted}>Aucune photo dans votre profil general</p>
            ) : (
              <>
                <p className={`${textMuted} text-sm mb-4`}>
                  Selectionnez les photos a copier vers cet evenement
                </p>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {generalPhotos.map((photo) => {
                    const isSelected = selectedToCopy.includes(photo.id);
                    return (
                      <button
                        key={photo.id}
                        onClick={() => toggleCopySelection(photo.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden ${
                          isSelected ? "ring-2 ring-[#1271FF]" : ""
                        }`}
                      >
                        <img
                          src={photoService.getPhotoUrl(photo.file_path)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#1271FF]/30 flex items-center justify-center">
                            <div className="w-6 h-6 bg-[#1271FF] rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {selectedToCopy.indexOf(photo.id) + 1}
                              </span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCopyModal(false);
                      setSelectedToCopy([]);
                    }}
                    className={`flex-1 py-3 ${cardBg} ${textColor} rounded-xl ${hoverBg} transition-colors`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCopyFromGeneral}
                    disabled={selectedToCopy.length === 0 || copying}
                    className="flex-1 py-3 bg-[#1271FF] text-white rounded-xl hover:bg-[#0d5dd8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {copying ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier ({selectedToCopy.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
