"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Loader2, Trash2 } from "lucide-react";

interface ImageUploaderProps {
  currentImage?: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  aspectRatio?: "square" | "banner"; // square = 1:1, banner = 16:9
  label?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function ImageUploader({
  currentImage,
  onUpload,
  onDelete,
  aspectRatio = "square",
  label = "Image",
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const aspectRatioClasses = {
    square: "aspect-square",
    banner: "aspect-[16/9]",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Type de fichier non autorise. Types acceptes: ${acceptedTypes.join(", ")}`);
      return;
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`Le fichier est trop volumineux. Taille max: ${maxSizeMB}Mo`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      await onUpload(file);
      setPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setError(message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setDeleting(true);
    setError("");
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-[#303030]">{label}</label>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className={`relative ${aspectRatioClasses[aspectRatio]} bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300`}>
        {displayImage ? (
          <>
            <Image
              src={displayImage}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Upload className="w-10 h-10 mb-2" />
            <p className="text-sm">Cliquez pour uploader</p>
            <p className="text-xs mt-1">Max {maxSizeMB}Mo</p>
          </div>
        )}

        {/* Clickable overlay */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          disabled={uploading || deleting}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[#303030] text-white rounded-lg hover:bg-[#404040] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Upload...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {currentImage ? "Changer" : "Uploader"}
            </>
          )}
        </button>

        {currentImage && onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={uploading || deleting}
            className="flex items-center justify-center gap-2 py-2 px-4 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 w-full">
            <h3 className="font-semibold text-lg text-[#303030] mb-2">
              Supprimer l&apos;image
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              Etes-vous sur de vouloir supprimer cette image ?
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
