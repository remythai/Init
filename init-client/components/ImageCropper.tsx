// components/ImageCropper.tsx
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageLoadEventData,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const SCREEN = Dimensions.get("window");
const MIN_CROP = 80;
const EDGE_HIT = 30;

type DragMode = "none" | "move" | "tl" | "tr" | "bl" | "br" | "top" | "bottom" | "left" | "right";

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageCropperProps {
  uri: string;
  visible: boolean;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ uri, visible, onCrop, onCancel }: ImageCropperProps) {
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: SCREEN.width, h: SCREEN.height - 200 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropping, setCropping] = useState(false);

  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const cropRef = useRef(cropRect);
  cropRef.current = cropRect;

  const dragMode = useRef<DragMode>("none");
  const lastTouch = useRef({ x: 0, y: 0 });

  const imgRectRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const containerPageRef = useRef({ x: 0, y: 0 });

  const computeImageRect = useCallback((imgW: number, imgH: number, contW: number, contH: number) => {
    const aspect = imgW / imgH;
    let dispW: number, dispH: number;
    if (aspect > contW / contH) {
      dispW = contW;
      dispH = contW / aspect;
    } else {
      dispH = contH;
      dispW = contH * aspect;
    }
    return { x: (contW - dispW) / 2, y: (contH - dispH) / 2, w: dispW, h: dispH };
  }, []);

  const initCrop = useCallback((imgW: number, imgH: number, contW: number, contH: number) => {
    const rect = computeImageRect(imgW, imgH, contW, contH);
    imgRectRef.current = rect;
    const cropW = rect.w * 0.85;
    const cropH = rect.h * 0.85;
    const crop: CropRect = {
      x: rect.x + (rect.w - cropW) / 2,
      y: rect.y + (rect.h - cropH) / 2,
      w: cropW,
      h: cropH,
    };
    setCropRect(crop);
    cropRef.current = crop;
  }, [computeImageRect]);

  const containerSizeRef = useRef(containerSize);
  containerSizeRef.current = containerSize;

  const onImageLoad = useCallback((e: NativeSyntheticEvent<ImageLoadEventData>) => {
    const { width: w, height: h } = e.nativeEvent.source;
    setImageSize({ w, h });
    setImageLoaded(true);
    initCrop(w, h, containerSizeRef.current.w, containerSizeRef.current.h);
  }, [initCrop]);

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ w: width, h: height });
    (e.target as any)?.measureInWindow?.((px: number, py: number) => {
      containerPageRef.current = { x: px, y: py };
    });
    if (imageSize.w > 0) {
      initCrop(imageSize.w, imageSize.h, width, height);
    }
  };

  const clampCrop = useCallback((rect: CropRect): CropRect => {
    const ir = imgRectRef.current;
    const w = Math.max(MIN_CROP, Math.min(ir.w, rect.w));
    const h = Math.max(MIN_CROP, Math.min(ir.h, rect.h));
    const x = Math.max(ir.x, Math.min(ir.x + ir.w - w, rect.x));
    const y = Math.max(ir.y, Math.min(ir.y + ir.h - h, rect.y));
    return { x, y, w, h };
  }, []);

  const getDragMode = (localX: number, localY: number): DragMode => {
    const c = cropRef.current;
    const inX = localX >= c.x - EDGE_HIT && localX <= c.x + c.w + EDGE_HIT;
    const inY = localY >= c.y - EDGE_HIT && localY <= c.y + c.h + EDGE_HIT;
    if (!inX || !inY) return "move";

    const nearLeft = Math.abs(localX - c.x) < EDGE_HIT;
    const nearRight = Math.abs(localX - (c.x + c.w)) < EDGE_HIT;
    const nearTop = Math.abs(localY - c.y) < EDGE_HIT;
    const nearBottom = Math.abs(localY - (c.y + c.h)) < EDGE_HIT;

    if (nearTop && nearLeft) return "tl";
    if (nearTop && nearRight) return "tr";
    if (nearBottom && nearLeft) return "bl";
    if (nearBottom && nearRight) return "br";
    if (nearTop) return "top";
    if (nearBottom) return "bottom";
    if (nearLeft) return "left";
    if (nearRight) return "right";

    return "move";
  };

  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    const localX = touch.pageX - containerPageRef.current.x;
    const localY = touch.pageY - containerPageRef.current.y;
    dragMode.current = getDragMode(localX, localY);
    lastTouch.current = { x: touch.pageX, y: touch.pageY };
  }, []);

  const onTouchMove = useCallback((e: GestureResponderEvent) => {
    const touch = e.nativeEvent;
    const dx = touch.pageX - lastTouch.current.x;
    const dy = touch.pageY - lastTouch.current.y;
    const c = cropRef.current;
    const ir = imgRectRef.current;
    let next: CropRect = { ...c };

    switch (dragMode.current) {
      case "move":
        next = clampCrop({ x: c.x + dx, y: c.y + dy, w: c.w, h: c.h });
        break;

      // Corners: resize both width and height independently
      case "tl": {
        const newW = Math.max(MIN_CROP, Math.min(c.w - dx, ir.w));
        const newH = Math.max(MIN_CROP, Math.min(c.h - dy, ir.h));
        next = { x: c.x + (c.w - newW), y: c.y + (c.h - newH), w: newW, h: newH };
        break;
      }
      case "tr": {
        const newW = Math.max(MIN_CROP, Math.min(c.w + dx, ir.w));
        const newH = Math.max(MIN_CROP, Math.min(c.h - dy, ir.h));
        next = { x: c.x, y: c.y + (c.h - newH), w: newW, h: newH };
        break;
      }
      case "bl": {
        const newW = Math.max(MIN_CROP, Math.min(c.w - dx, ir.w));
        const newH = Math.max(MIN_CROP, Math.min(c.h + dy, ir.h));
        next = { x: c.x + (c.w - newW), y: c.y, w: newW, h: newH };
        break;
      }
      case "br": {
        const newW = Math.max(MIN_CROP, Math.min(c.w + dx, ir.w));
        const newH = Math.max(MIN_CROP, Math.min(c.h + dy, ir.h));
        next = { x: c.x, y: c.y, w: newW, h: newH };
        break;
      }

      // Edges: resize only one axis
      case "top": {
        const newH = Math.max(MIN_CROP, Math.min(c.h - dy, ir.h));
        next = { x: c.x, y: c.y + (c.h - newH), w: c.w, h: newH };
        break;
      }
      case "bottom": {
        const newH = Math.max(MIN_CROP, Math.min(c.h + dy, ir.h));
        next = { x: c.x, y: c.y, w: c.w, h: newH };
        break;
      }
      case "left": {
        const newW = Math.max(MIN_CROP, Math.min(c.w - dx, ir.w));
        next = { x: c.x + (c.w - newW), y: c.y, w: newW, h: c.h };
        break;
      }
      case "right": {
        const newW = Math.max(MIN_CROP, Math.min(c.w + dx, ir.w));
        next = { x: c.x, y: c.y, w: newW, h: c.h };
        break;
      }
    }

    // Clamp within image bounds
    next.x = Math.max(ir.x, Math.min(ir.x + ir.w - next.w, next.x));
    next.y = Math.max(ir.y, Math.min(ir.y + ir.h - next.h, next.y));

    lastTouch.current = { x: touch.pageX, y: touch.pageY };
    setCropRect(next);
    cropRef.current = next;
  }, [clampCrop]);

  const onTouchEnd = useCallback(() => {
    dragMode.current = "none";
  }, []);

  const handleCrop = async () => {
    setCropping(true);
    try {
      const ir = imgRectRef.current;
      const c = cropRef.current;

      const scaleX = imageSize.w / ir.w;
      const scaleY = imageSize.h / ir.h;
      const originX = Math.max(0, Math.round((c.x - ir.x) * scaleX));
      const originY = Math.max(0, Math.round((c.y - ir.y) * scaleY));
      const cropW = Math.round(c.w * scaleX);
      const cropH = Math.round(c.h * scaleY);

      const result = await manipulateAsync(
        uri,
        [
          {
            crop: {
              originX,
              originY,
              width: Math.min(cropW, imageSize.w - originX),
              height: Math.min(cropH, imageSize.h - originY),
            },
          },
        ],
        { compress: 0.85, format: SaveFormat.JPEG }
      );

      onCrop(result.uri);
    } catch (err) {
      console.error("Crop error:", err);
      onCrop(uri);
    } finally {
      setCropping(false);
    }
  };

  const imgRect = imageSize.w > 0
    ? computeImageRect(imageSize.w, imageSize.h, containerSize.w, containerSize.h)
    : { x: 0, y: 0, w: containerSize.w, h: containerSize.h };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Annuler</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Recadrer</Text>
          <Pressable onPress={handleCrop} style={[styles.headerBtn, styles.confirmBtn]} disabled={cropping || !imageLoaded}>
            <Text style={[styles.headerBtnText, styles.confirmText]}>
              {cropping ? "..." : "Valider"}
            </Text>
          </Pressable>
        </View>

        {/* Crop area */}
        <View
          style={styles.cropContainer}
          onLayout={onContainerLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderStart={onTouchStart}
          onResponderMove={onTouchMove}
          onResponderRelease={onTouchEnd}
          onResponderTerminate={onTouchEnd}
        >
          {/* Image */}
          <Image
            source={{ uri }}
            style={{
              position: "absolute",
              left: imgRect.x,
              top: imgRect.y,
              width: imgRect.w,
              height: imgRect.h,
            }}
            resizeMode="contain"
            onLoad={onImageLoad}
          />

          {/* Loading spinner */}
          {!imageLoaded && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {/* Dark mask - only show after image loaded */}
          {imageLoaded && <View style={styles.maskContainer} pointerEvents="none">
            {/* Top */}
            <View style={[styles.mask, {
              top: 0, left: 0, right: 0,
              height: Math.max(0, cropRect.y),
            }]} />
            {/* Bottom */}
            <View style={[styles.mask, {
              top: cropRect.y + cropRect.h, left: 0, right: 0, bottom: 0,
            }]} />
            {/* Left */}
            <View style={[styles.mask, {
              top: cropRect.y, left: 0,
              width: Math.max(0, cropRect.x),
              height: cropRect.h,
            }]} />
            {/* Right */}
            <View style={[styles.mask, {
              top: cropRect.y,
              left: cropRect.x + cropRect.w,
              right: 0,
              height: cropRect.h,
            }]} />

            {/* Crop frame */}
            <View style={[styles.cropFrame, {
              top: cropRect.y,
              left: cropRect.x,
              width: cropRect.w,
              height: cropRect.h,
            }]}>
              {/* Corner handles */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {/* Edge handles (midpoints) */}
              <View style={[styles.edgeHandle, { top: -3, left: "50%", marginLeft: -12, width: 24, height: 6 }]} />
              <View style={[styles.edgeHandle, { bottom: -3, left: "50%", marginLeft: -12, width: 24, height: 6 }]} />
              <View style={[styles.edgeHandle, { left: -3, top: "50%", marginTop: -12, width: 6, height: 24 }]} />
              <View style={[styles.edgeHandle, { right: -3, top: "50%", marginTop: -12, width: 6, height: 24 }]} />
              {/* Grid lines */}
              <View style={[styles.gridLine, { left: "33.3%", top: 0, bottom: 0, width: 1 }]} />
              <View style={[styles.gridLine, { left: "66.6%", top: 0, bottom: 0, width: 1 }]} />
              <View style={[styles.gridLine, { top: "33.3%", left: 0, right: 0, height: 1 }]} />
              <View style={[styles.gridLine, { top: "66.6%", left: 0, right: 0, height: 1 }]} />
            </View>
          </View>}
        </View>

        {/* Hint */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Glissez pour deplacer, tirez les bords pour redimensionner</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: "#1271FF",
    borderRadius: 8,
  },
  confirmText: {
    fontWeight: "600",
  },
  cropContainer: {
    flex: 1,
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  mask: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  cropFrame: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fff",
    borderWidth: 4,
  },
  cornerTL: { top: -3, left: -3, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: -3, right: -3, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: -3, left: -3, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: -3, right: -3, borderLeftWidth: 0, borderTopWidth: 0 },
  edgeHandle: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
});
