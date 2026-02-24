// components/PhotoManager.tsx
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { photoService } from "@/services/photo.service";
import type { Photo } from "@/services/photo.service";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 16) / 3;

export type { Photo } from "@/services/photo.service";

interface PhotoManagerProps {
  eventId?: string;
  maxPhotos?: number;
  onPhotosChange?: (photos: Photo[]) => void;
}

export default function PhotoManager({
  eventId,
  maxPhotos = 6,
  onPhotosChange,
}: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError("");
      const loaded = await photoService.getPhotos(eventId);
      setPhotos(loaded);
      onPhotosChange?.(loaded);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les photos");
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Autorisez l'accès à la galerie.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      setUploading(true);
      setError("");
      const newPhoto = await photoService.uploadPhoto(result.assets[0].uri, eventId);
      const updated = [...photos, newPhoto];
      setPhotos(updated);
      onPhotosChange?.(updated);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    try {
      setError("");
      await photoService.deletePhoto(photo.id);
      const updated = photos.filter((p) => p.id !== photo.id);
      setPhotos(updated);
      onPhotosChange?.(updated);
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || "Impossible de supprimer");
    }
  };

  const setPrimary = async (photo: Photo) => {
    try {
      setError("");
      await photoService.setPrimaryPhoto(photo.id);
      await loadPhotos();
    } catch (err: any) {
      setError(err.message || "Impossible de définir comme principale");
    }
  };

  const reorderPhotos = async (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
    onPhotosChange?.(newPhotos);
    try {
      const photoIds = newPhotos.map((p) => p.id);
      const reordered = await photoService.reorderPhotos(photoIds, eventId);
      setPhotos(reordered);
      onPhotosChange?.(reordered);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réorganisation");
      await loadPhotos();
    }
  };

  const photoPositions = useRef<{ x: number; y: number }[]>([]);

  const handleLongPressReorder = (fromIndex: number) => {
    Alert.alert(
      "Déplacer la photo",
      `Déplacer la photo ${fromIndex + 1} vers :`,
      [
        ...photos.map((_, toIndex) =>
          toIndex !== fromIndex
            ? {
                text: `Position ${toIndex + 1}${toIndex === 0 ? " (principale)" : ""}`,
                onPress: () => {
                  const newPhotos = [...photos];
                  const [moved] = newPhotos.splice(fromIndex, 1);
                  newPhotos.splice(toIndex, 0, moved);
                  reorderPhotos(newPhotos);
                },
              }
            : null
        ).filter(Boolean) as any,
        { text: "Annuler", style: "cancel" },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Erreur */}
      {!!error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={16} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError("")}>
            <MaterialIcons name="close" size={16} color="#dc2626" />
          </Pressable>
        </View>
      )}

      {/* Hint */}
      {photos.length > 1 && (
        <Text style={styles.hint}>
          Appuyez longuement sur une photo pour la déplacer.
        </Text>
      )}

      {/* Grille */}
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo.id}
            style={[styles.photoCell, draggingIndex === index && styles.photoCellDragging]}
            onLongPress={() => handleLongPressReorder(index)}
            delayLongPress={400}
          >
            <Image
              source={{ uri: photoService.getPhotoUrl(photo.file_path) }}
              style={styles.photoImage}
              resizeMode="cover"
            />

            {/* Numéro de position */}
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>{index + 1}</Text>
            </View>

            {/* Badge principale */}
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <MaterialIcons name="star" size={10} color="#fff" />
                <Text style={styles.primaryText}>Principale</Text>
              </View>
            )}

            {/* Actions : étoile + poubelle */}
            <View style={styles.actionsOverlay}>
              {index > 0 && (
                <Pressable
                  style={[styles.actionBtn, styles.primaryBtn]}
                  onPress={() => setPrimary(photo)}
                  hitSlop={8}
                >
                  <MaterialIcons name="star" size={14} color="#fff" />
                </Pressable>
              )}
              <Pressable
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => setDeleteTarget(photo)}
                hitSlop={8}
              >
                <MaterialIcons name="delete" size={14} color="#fff" />
              </Pressable>
            </View>
          </Pressable>
        ))}

        {/* Bouton ajouter */}
        {photos.length < maxPhotos && (
          <Pressable
            style={styles.addCell}
            onPress={uploadPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <>
                <MaterialIcons name="add" size={32} color="#9ca3af" />
                <Text style={styles.addText}>Ajouter</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Compteur */}
      <Text style={styles.counter}>
        {photos.length} / {maxPhotos} photos
      </Text>

      {/* Modal suppression */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supprimer cette photo ?</Text>

            {deleteTarget && (
              <Image
                source={{ uri: photoService.getPhotoUrl(deleteTarget.file_path) }}
                style={styles.modalPreview}
                resizeMode="cover"
              />
            )}

            <Text style={styles.modalSubtitle}>Cette action est irréversible.</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={() => deleteTarget && deletePhoto(deleteTarget)}
              >
                <Text style={styles.modalDeleteText}>Supprimer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  center: { paddingVertical: 32, alignItems: "center" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: "#dc2626" },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f3f4f6",
  },
  photoCellDragging: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  positionBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  positionText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  primaryBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "#eab308",
    borderRadius: 99,
  },
  primaryText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  actionsOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    gap: 4,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: { backgroundColor: "#eab308" },
  deleteBtn: { backgroundColor: "#ef4444" },
  addCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f9fafb",
  },
  addText: { fontSize: 12, color: "#9ca3af" },
  counter: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#111827", textAlign: "center" },
  modalPreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  modalSubtitle: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelBtn: { backgroundColor: "#f3f4f6" },
  modalDeleteBtn: { backgroundColor: "#ef4444" },
  modalCancelText: { fontWeight: "600", color: "#111827" },
  modalDeleteText: { fontWeight: "600", color: "#fff" },
});