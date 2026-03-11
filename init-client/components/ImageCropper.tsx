import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN = Dimensions.get("window");

interface ImageCropperProps {
  uri: string;
  visible: boolean;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  circular?: boolean;
}

export default function ImageCropper({
  uri,
  visible,
  onCrop,
  onCancel,
  aspectRatio = 3 / 4,
  circular = false,
}: ImageCropperProps) {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [cropping, setCropping] = useState(false);

  // Image dimensions (from getSize)
  const natW = useRef(0);
  const natH = useRef(0);

  // Container
  const contW = useRef(SCREEN.width);
  const contH = useRef(SCREEN.height * 0.6);

  // Base display size at scale=1
  const baseW = useRef(0);
  const baseH = useRef(0);

  // Transform
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Shared for worklets
  const sBaseW = useSharedValue(0);
  const sBaseH = useSharedValue(0);
  const sContW = useSharedValue(SCREEN.width);
  const sContH = useSharedValue(SCREEN.height * 0.6);
  const sFX = useSharedValue(0);
  const sFY = useSharedValue(0);
  const sFW = useSharedValue(0);
  const sFH = useSharedValue(0);

  const getCropFrame = useCallback(
    (cw: number, ch: number) => {
      const pad = 24;
      const maxW = cw - pad * 2;
      const maxH = ch - pad * 2;
      let fw: number, fh: number;
      if (maxW / maxH > aspectRatio) {
        fh = maxH;
        fw = fh * aspectRatio;
      } else {
        fw = maxW;
        fh = fw / aspectRatio;
      }
      return { x: (cw - fw) / 2, y: (ch - fh) / 2, w: fw, h: fh };
    },
    [aspectRatio]
  );

  const setup = useCallback(
    (nw: number, nh: number, cw: number, ch: number) => {
      const f = getCropFrame(cw, ch);
      const sc = Math.max(f.w / nw, f.h / nh);
      const bw = nw * sc;
      const bh = nh * sc;

      baseW.current = bw;
      baseH.current = bh;
      sBaseW.value = bw;
      sBaseH.value = bh;
      sContW.value = cw;
      sContH.value = ch;
      sFX.value = f.x;
      sFY.value = f.y;
      sFW.value = f.w;
      sFH.value = f.h;

      scale.value = 1;
      tx.value = 0;
      ty.value = 0;
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
    },
    [getCropFrame]
  );

  // Get image dimensions
  useEffect(() => {
    if (!visible || !uri) return;
    setReady(false);
    Image.getSize(
      uri,
      (w, h) => {
        natW.current = w;
        natH.current = h;
        setup(w, h, contW.current, contH.current);
        setReady(true);
      },
      () => onCrop(uri)
    );
  }, [uri, visible]);

  const onContainerLayout = useCallback(
    (e: any) => {
      const { width, height } = e.nativeEvent.layout;
      contW.current = width;
      contH.current = height;
      if (natW.current > 0) {
        setup(natW.current, natH.current, width, height);
      }
    },
    [setup]
  );

  const clamp = (px: number, py: number, s: number) => {
    "worklet";
    const iw = sBaseW.value * s;
    const ih = sBaseH.value * s;
    const il = sContW.value / 2 + px - iw / 2;
    const it = sContH.value / 2 + py - ih / 2;
    let cx = px, cy = py;
    if (il > sFX.value) cx -= il - sFX.value;
    if (il + iw < sFX.value + sFW.value) cx += sFX.value + sFW.value - il - iw;
    if (it > sFY.value) cy -= it - sFY.value;
    if (it + ih < sFY.value + sFH.value) cy += sFY.value + sFH.value - it - ih;
    return { x: cx, y: cy };
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const c = clamp(savedTx.value + e.translationX, savedTy.value + e.translationY, scale.value);
      tx.value = c.x;
      ty.value = c.y;
    })
    .minPointers(1)
    .maxPointers(2);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const ns = Math.max(1, Math.min(savedScale.value * e.scale, 5));
      const cx = sContW.value / 2;
      const cy = sContH.value / 2;
      const rx = e.focalX - cx - savedTx.value;
      const ry = e.focalY - cy - savedTy.value;
      const r = ns / savedScale.value;
      scale.value = ns;
      const c = clamp(e.focalX - cx - rx * r, e.focalY - cy - ry * r, ns);
      tx.value = c.x;
      ty.value = c.y;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  // Use Animated.View for positioning, regular Image inside to avoid Animated.Image issues
  const animStyle = useAnimatedStyle(() => {
    const iw = sBaseW.value * scale.value;
    const ih = sBaseH.value * scale.value;
    return {
      position: "absolute" as const,
      left: sContW.value / 2 + tx.value - iw / 2,
      top: sContH.value / 2 + ty.value - ih / 2,
      width: iw,
      height: ih,
    };
  });

  const handleReset = () => {
    setup(natW.current, natH.current, contW.current, contH.current);
  };

  const handleCrop = async () => {
    setCropping(true);
    try {
      const nw = natW.current;
      const nh = natH.current;
      const cw = contW.current;
      const ch = contH.current;
      const f = getCropFrame(cw, ch);
      const bw = baseW.current;
      const bh = baseH.current;

      const s = scale.value;
      const ttx = tx.value;
      const tty = ty.value;

      const iw = bw * s;
      const ih = bh * s;
      const il = cw / 2 + ttx - iw / 2;
      const it = ch / 2 + tty - ih / 2;

      // Step 1: Resize image to displayed size (normalizes EXIF rotation)
      // Use 2x for better quality output
      const quality = 2;
      const resizeW = Math.round(iw * quality);
      const resizeH = Math.round(ih * quality);

      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: resizeW, height: resizeH } }],
        { format: SaveFormat.JPEG }
      );

      // Step 2: Crop in screen coordinates (scaled by quality factor)
      const cropX = Math.round(Math.max(0, (f.x - il) * quality));
      const cropY = Math.round(Math.max(0, (f.y - it) * quality));
      const cropW = Math.round(Math.min(f.w * quality, resizeW - cropX));
      const cropH = Math.round(Math.min(f.h * quality, resizeH - cropY));

      console.log("CROP DEBUG:", JSON.stringify({
        resized: { resizeW, resizeH },
        crop: { cropX, cropY, cropW, cropH },
      }));

      if (cropW <= 0 || cropH <= 0) {
        onCrop(uri);
        return;
      }

      const result = await manipulateAsync(
        resized.uri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
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

  const frame = getCropFrame(contW.current, contH.current);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <GestureHandlerRootView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Recadrer</Text>
          <Pressable onPress={handleReset} style={styles.headerBtn}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.cropArea} onLayout={onContainerLayout}>
          <GestureDetector gesture={composed}>
            <Animated.View style={StyleSheet.absoluteFill}>
              {ready ? (
                <Animated.View style={animStyle}>
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="stretch"
                  />
                </Animated.View>
              ) : (
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              )}
            </Animated.View>
          </GestureDetector>

          {!ready && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {ready && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {circular ? (
                <>
                  <View
                    style={{
                      position: "absolute",
                      top: frame.y + frame.h / 2 - Math.max(SCREEN.width, SCREEN.height),
                      left: frame.x + frame.w / 2 - Math.max(SCREEN.width, SCREEN.height),
                      width: Math.max(SCREEN.width, SCREEN.height) * 2,
                      height: Math.max(SCREEN.width, SCREEN.height) * 2,
                      borderRadius: Math.max(SCREEN.width, SCREEN.height),
                      borderWidth: Math.max(SCREEN.width, SCREEN.height) - frame.w / 2,
                      borderColor: "rgba(0,0,0,0.6)",
                    }}
                  />
                  <View
                    style={[
                      styles.cropFrame,
                      { top: frame.y, left: frame.x, width: frame.w, height: frame.h, borderRadius: frame.w / 2 },
                    ]}
                  />
                </>
              ) : (
                <>
                  <View style={[styles.mask, { top: 0, left: 0, right: 0, height: frame.y }]} />
                  <View style={[styles.mask, { top: frame.y + frame.h, left: 0, right: 0, bottom: 0 }]} />
                  <View style={[styles.mask, { top: frame.y, left: 0, width: frame.x, height: frame.h }]} />
                  <View style={[styles.mask, { top: frame.y, left: frame.x + frame.w, right: 0, height: frame.h }]} />
                  <View style={[
                    styles.cropFrame,
                    { top: frame.y, left: frame.x, width: frame.w, height: frame.h },
                  ]}>
                    <View style={[styles.grid, { left: "33.3%", top: 0, bottom: 0, width: 1 }]} />
                    <View style={[styles.grid, { left: "66.6%", top: 0, bottom: 0, width: 1 }]} />
                    <View style={[styles.grid, { top: "33.3%", left: 0, right: 0, height: 1 }]} />
                    <View style={[styles.grid, { top: "66.6%", left: 0, right: 0, height: 1 }]} />
                    <View style={[styles.corner, styles.cTL]} />
                    <View style={[styles.corner, styles.cTR]} />
                    <View style={[styles.corner, styles.cBL]} />
                    <View style={[styles.corner, styles.cBR]} />
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            onPress={handleCrop}
            style={[styles.confirmBtn, (cropping || !ready) && { opacity: 0.5 }]}
            disabled={cropping || !ready}
          >
            <Text style={styles.confirmText}>{cropping ? "..." : "Valider"}</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: "#fff", fontSize: 16 },
  resetText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  cropArea: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  mask: { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)" },
  cropFrame: { position: "absolute", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.8)" },
  grid: { position: "absolute", backgroundColor: "rgba(255,255,255,0.2)" },
  corner: { position: "absolute", borderColor: "#fff", borderWidth: 3 },
  cTL: { top: -2, left: -2, width: 20, height: 20, borderRightWidth: 0, borderBottomWidth: 0 },
  cTR: { top: -2, right: -2, width: 20, height: 20, borderLeftWidth: 0, borderBottomWidth: 0 },
  cBL: { bottom: -2, left: -2, width: 20, height: 20, borderRightWidth: 0, borderTopWidth: 0 },
  cBR: { bottom: -2, right: -2, width: 20, height: 20, borderLeftWidth: 0, borderTopWidth: 0 },
  footer: { paddingVertical: 16, paddingHorizontal: 20, alignItems: "center" },
  confirmBtn: { backgroundColor: "#1271FF", borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
