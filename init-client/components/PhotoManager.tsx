// components/PhotoManager.tsx
import { type Theme } from "@/constants/theme";
import { useTheme, shared } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { photoService } from "@/services/photo.service";
import type { Photo } from "@/services/photo.service";

const GAP = 8;
const COLUMNS = 3;

export type { Photo } from "@/services/photo.service";

interface PhotoManagerProps {
  eventId?: string;
  maxPhotos?: number;
  onPhotosChange?: (photos: Photo[]) => void;
}

function getPosition(index: number, photoSize: number) {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { x: col * (photoSize + GAP), y: row * (photoSize + GAP) };
}

function getIndexFromCenter(cx: number, cy: number, total: number, photoSize: number): number | null {
  for (let i = 0; i < total; i++) {
    const pos = getPosition(i, photoSize);
    if (cx >= pos.x && cx < pos.x + photoSize && cy >= pos.y && cy < pos.y + photoSize) {
      return i;
    }
  }
  return null;
}

export default function PhotoManager({
  eventId,
  maxPhotos = 6,
  onPhotosChange,
}: PhotoManagerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const photoSize = containerWidth > 0 ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  // Drag state
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [hoverTarget, setHoverTarget] = useState<number | null>(null);
  const dragTranslate = useRef(new Animated.ValueXY()).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Track grid position on screen
  const gridRef = useRef<View>(null);
  const gridPageY = useRef(0);
  const gridPageX = useRef(0);

  const handleGridLayout = useCallback(() => {
    gridRef.current?.measureInWindow((x, y) => {
      gridPageX.current = x;
      gridPageY.current = y;
    });
  }, []);

  // Drag refs for PanResponder (avoid stale closures)
  const photoSizeRef = useRef(photoSize);
  photoSizeRef.current = photoSize;
  const dragFromRef = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const doReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    const current = photosRef.current;
    if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return;

    const newPhotos = [...current];
    const [moved] = newPhotos.splice(fromIndex, 1);
    if (!moved) return;
    newPhotos.splice(toIndex, 0, moved);

    const newFirstId = newPhotos[0].id;
    const oldFirstId = current[0].id;
    const primaryChanged = newFirstId !== oldFirstId;

    setPhotos(newPhotos);
    onPhotosChange?.(newPhotos);

    try {
      if (primaryChanged) {
        await photoService.setPrimaryPhoto(newFirstId);
      }
      const photoIds = newPhotos.map((p) => p.id);
      await photoService.reorderPhotos(photoIds, eventId);
      // Reload from server
      const loaded = await photoService.getPhotos(eventId);
      setPhotos(loaded);
      onPhotosChange?.(loaded);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la reorganisation");
      const loaded = await photoService.getPhotos(eventId);
      setPhotos(loaded);
      onPhotosChange?.(loaded);
    }
  }, [eventId, onPhotosChange]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => isLongPress.current,
      onMoveShouldSetPanResponderCapture: () => isLongPress.current,
      onPanResponderGrant: (e) => {
        // Measure grid position right now (handles scroll)
        gridRef.current?.measureInWindow((gx, gy) => {
          gridPageX.current = gx;
          gridPageY.current = gy;
        });
        const locX = e.nativeEvent.pageX - gridPageX.current;
        const locY = e.nativeEvent.pageY - gridPageY.current;
        touchStartRef.current = { x: locX, y: locY };
        const idx = getIndexFromCenter(locX, locY, photosRef.current.length, photoSizeRef.current);
        if (idx === null) return;

        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          dragFromRef.current = idx;
          setDragFrom(idx);
          dragTranslate.setValue({ x: 0, y: 0 });
          Animated.timing(dragOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }).start();
        }, 250);
      },
      onPanResponderMove: (_, gesture) => {
        // If moved too much before long press, cancel
        if (!isLongPress.current) {
          if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
          }
          return;
        }

        dragTranslate.setValue({ x: gesture.dx, y: gesture.dy });

        const from = dragFromRef.current;
        if (from === null) return;
        const sz = photoSizeRef.current;
        const origin = getPosition(from, sz);
        const cx = origin.x + sz / 2 + gesture.dx;
        const cy = origin.y + sz / 2 + gesture.dy;
        const target = getIndexFromCenter(cx, cy, photosRef.current.length, sz);
        setHoverTarget(target !== null && target !== from ? target : null);
      },
      onPanResponderRelease: (_, gesture) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        const from = dragFromRef.current;
        const wasDragging = isLongPress.current;

        // Reset drag state
        isLongPress.current = false;
        dragFromRef.current = null;
        setDragFrom(null);
        setHoverTarget(null);
        dragTranslate.setValue({ x: 0, y: 0 });
        dragOpacity.setValue(1);

        if (!wasDragging || from === null) return;

        const sz = photoSizeRef.current;
        const origin = getPosition(from, sz);
        const cx = origin.x + sz / 2 + gesture.dx;
        const cy = origin.y + sz / 2 + gesture.dy;
        const to = getIndexFromCenter(cx, cy, photosRef.current.length, sz);

        if (to !== null && to !== from) {
          doReorder(from, to);
        }
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        isLongPress.current = false;
        dragFromRef.current = null;
        setDragFrom(null);
        setHoverTarget(null);
        dragTranslate.setValue({ x: 0, y: 0 });
        dragOpacity.setValue(1);
      },
    }),
  [doReorder]);

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
      Alert.alert("Permission refusee", "Autorisez l'acces a la galerie.");
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

  const totalSlots = photos.length + (photos.length < maxPhotos ? 1 : 0);
  const gridRows = Math.ceil(totalSlots / COLUMNS);
  const gridHeight = photoSize > 0 ? gridRows * (photoSize + GAP) - GAP : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.foreground} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={16} color={theme.colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError("")}>
            <MaterialIcons name="close" size={16} color={theme.colors.destructive} />
          </Pressable>
        </View>
      )}

      {photos.length > 1 && (
        <Text style={styles.hint}>
          Maintenez puis glissez pour reorganiser.
        </Text>
      )}

      <View
        ref={gridRef}
        style={[styles.grid, { height: gridHeight }]}
        onLayout={(e) => {
          setContainerWidth(e.nativeEvent.layout.width);
          handleGridLayout();
        }}
        {...panResponder.panHandlers}
      >
        {photos.map((photo, index) => {
          const pos = getPosition(index, photoSize);
          const isDragged = dragFrom === index;
          const isHover = hoverTarget === index;

          return (
            <Animated.View
              key={photo.id}
              style={[
                styles.photoCell,
                { position: "absolute", left: pos.x, top: pos.y, width: photoSize, height: photoSize },
                isDragged && {
                  transform: [
                    { translateX: dragTranslate.x },
                    { translateY: dragTranslate.y },
                    { scale: 1.08 },
                  ],
                  opacity: dragOpacity,
                  zIndex: 100,
                  elevation: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                },
              ]}
            >
              <Image
                source={{ uri: photoService.getPhotoUrl(photo.file_path) }}
                style={styles.photoImage}
                resizeMode="cover"
              />

              {/* Position number */}
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>

              {/* Primary badge */}
              {index === 0 && (
                <View style={styles.primaryBadge}>
                  <MaterialIcons name="star" size={10} color="#fff" />
                  <Text style={styles.primaryText}>Principale</Text>
                </View>
              )}

              {/* Delete button - only when not dragging */}
              {dragFrom === null && (
                <View style={styles.actionsOverlay}>
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => setDeleteTarget(photo)}
                    hitSlop={8}
                  >
                    <MaterialIcons name="delete" size={14} color="#fff" />
                  </Pressable>
                </View>
              )}

              {/* Hover indicator */}
              {isHover && (
                <View style={styles.hoverBorder} pointerEvents="none" />
              )}
            </Animated.View>
          );
        })}

        {/* Add photo slot */}
        {photos.length < maxPhotos && (() => {
          const addPos = getPosition(photos.length, photoSize);
          return (
            <Pressable
              style={[
                styles.addCell,
                { position: "absolute", left: addPos.x, top: addPos.y, width: photoSize, height: photoSize },
              ]}
              onPress={uploadPhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.placeholder} />
              ) : (
                <>
                  <MaterialIcons name="add" size={32} color={theme.colors.placeholder} />
                  <Text style={styles.addText}>Ajouter</Text>
                </>
              )}
            </Pressable>
          );
        })()}
      </View>

      {/* Counter */}
      <Text style={styles.counter}>
        {photos.length} / {maxPhotos} photos
      </Text>

      {/* Delete modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        statusBarTranslucent
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
            <Text style={styles.modalSubtitle}>Cette action est irreversible.</Text>
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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: 12 },
  center: { paddingVertical: 32, alignItems: "center" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: shared.errorLight,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: theme.colors.destructive },
  hint: { fontSize: 12, color: theme.colors.placeholder, textAlign: "center" },
  grid: {
    position: "relative",
    width: "100%",
  },
  photoCell: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.secondary,
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
  deleteBtn: { backgroundColor: "#ef4444" },
  hoverBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: 12,
  },
  addCell: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.secondary,
  },
  addText: { fontSize: 12, color: theme.colors.placeholder },
  counter: { fontSize: 13, color: theme.colors.placeholder, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.foreground, textAlign: "center" },
  modalPreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  modalSubtitle: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: "center" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelBtn: { backgroundColor: theme.colors.secondary },
  modalDeleteBtn: { backgroundColor: "#ef4444" },
  modalCancelText: { fontWeight: "600", color: theme.colors.foreground },
  modalDeleteText: { fontWeight: "600", color: "#fff" },
});
