"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio?: number | null; // e.g. 1 for square, 16/9 for banner, null for free
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  outputType?: string;
  outputQuality?: number;
  darkMode?: boolean;
  circular?: boolean; // Show circular overlay (crop stays square 1:1, output is square)
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({
  imageSrc,
  aspectRatio = 1,
  onCrop,
  onCancel,
  outputType = "image/jpeg",
  outputQuality = 0.92,
  darkMode = false,
  circular = false,
}: ImageCropperProps) {
  // Force 1:1 aspect ratio when circular
  if (circular) aspectRatio = 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [dragging, setDragging] = useState<"move" | "nw" | "ne" | "sw" | "se" | null>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, crop: { x: 0, y: 0, width: 0, height: 0 } });

  const MIN_SIZE = 40;

  const computeLayout = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return;
    setImageSize({ width: natW, height: natH });

    const containerRect = container.getBoundingClientRect();
    const maxW = containerRect.width;
    const maxH = containerRect.height;
    if (!maxW || !maxH) return;

    const scale = Math.min(maxW / natW, maxH / natH);
    const dispW = natW * scale;
    const dispH = natH * scale;
    const offX = (maxW - dispW) / 2;
    const offY = (maxH - dispH) / 2;

    setDisplaySize({ width: dispW, height: dispH, offsetX: offX, offsetY: offY });

    // Init crop to centered max area
    let cropW: number, cropH: number;
    if (aspectRatio) {
      if (dispW / dispH > aspectRatio) {
        cropH = dispH * 0.85;
        cropW = cropH * aspectRatio;
      } else {
        cropW = dispW * 0.85;
        cropH = cropW / aspectRatio;
      }
    } else {
      cropW = dispW * 0.85;
      cropH = dispH * 0.85;
    }

    setCrop({
      x: (dispW - cropW) / 2,
      y: (dispH - cropH) / 2,
      width: cropW,
      height: cropH,
    });

    setImageLoaded(true);
  }, [aspectRatio]);

  const handleImageLoad = useCallback(() => {
    // Use requestAnimationFrame to ensure the container is fully laid out
    requestAnimationFrame(() => {
      computeLayout();
    });
  }, [computeLayout]);

  // Clamp crop to bounds
  const clampCrop = useCallback((c: CropArea): CropArea => {
    const w = Math.max(MIN_SIZE, Math.min(c.width, displaySize.width));
    const h = Math.max(MIN_SIZE, Math.min(c.height, displaySize.height));
    const x = Math.max(0, Math.min(c.x, displaySize.width - w));
    const y = Math.max(0, Math.min(c.y, displaySize.height - h));
    return { x, y, width: w, height: h };
  }, [displaySize]);

  const getPointerPos = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0]?.clientY ?? 0;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left - displaySize.offsetX,
      y: clientY - rect.top - displaySize.offsetY,
    };
  }, [displaySize]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, type: "move" | "nw" | "ne" | "sw" | "se") => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPointerPos(e);
    dragStart.current = { mouseX: pos.x, mouseY: pos.y, crop: { ...crop } };
    setDragging(type);
  }, [crop, getPointerPos]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const pos = getPointerPos(e);
      const dx = pos.x - dragStart.current.mouseX;
      const dy = pos.y - dragStart.current.mouseY;
      const prev = dragStart.current.crop;

      let newCrop: CropArea;

      if (dragging === "move") {
        newCrop = clampCrop({ x: prev.x + dx, y: prev.y + dy, width: prev.width, height: prev.height });
      } else {
        let nx = prev.x, ny = prev.y, nw = prev.width, nh = prev.height;

        if (dragging === "se") {
          nw = Math.max(MIN_SIZE, prev.width + dx);
          if (aspectRatio) {
            nh = nw / aspectRatio;
          } else {
            nh = Math.max(MIN_SIZE, prev.height + dy);
          }
        } else if (dragging === "sw") {
          nw = Math.max(MIN_SIZE, prev.width - dx);
          nx = prev.x + prev.width - nw;
          if (aspectRatio) {
            nh = nw / aspectRatio;
          } else {
            nh = Math.max(MIN_SIZE, prev.height + dy);
          }
        } else if (dragging === "ne") {
          nw = Math.max(MIN_SIZE, prev.width + dx);
          if (aspectRatio) {
            nh = nw / aspectRatio;
            ny = prev.y + prev.height - nh;
          } else {
            nh = Math.max(MIN_SIZE, prev.height - dy);
            ny = prev.y + prev.height - nh;
          }
        } else if (dragging === "nw") {
          nw = Math.max(MIN_SIZE, prev.width - dx);
          nx = prev.x + prev.width - nw;
          if (aspectRatio) {
            nh = nw / aspectRatio;
            ny = prev.y + prev.height - nh;
          } else {
            nh = Math.max(MIN_SIZE, prev.height - dy);
            ny = prev.y + prev.height - nh;
          }
        }

        // Clamp to image bounds
        if (nx < 0) { nw += nx; nx = 0; }
        if (ny < 0) { nh += ny; ny = 0; }
        if (nx + nw > displaySize.width) { nw = displaySize.width - nx; }
        if (ny + nh > displaySize.height) { nh = displaySize.height - ny; }

        if (aspectRatio) {
          const minDim = Math.min(nw, nh * aspectRatio);
          nw = minDim;
          nh = minDim / aspectRatio;
        }

        newCrop = { x: nx, y: ny, width: Math.max(MIN_SIZE, nw), height: Math.max(MIN_SIZE, nh) };
      }

      setCrop(newCrop);
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragging, clampCrop, getPointerPos, displaySize, aspectRatio]);

  const handleReset = () => {
    let cropW: number, cropH: number;
    if (aspectRatio) {
      if (displaySize.width / displaySize.height > aspectRatio) {
        cropH = displaySize.height * 0.85;
        cropW = cropH * aspectRatio;
      } else {
        cropW = displaySize.width * 0.85;
        cropH = cropW / aspectRatio;
      }
    } else {
      cropW = displaySize.width * 0.85;
      cropH = displaySize.height * 0.85;
    }
    setCrop({
      x: (displaySize.width - cropW) / 2,
      y: (displaySize.height - cropH) / 2,
      width: cropW,
      height: cropH,
    });
  };

  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img || !displaySize.width) return;

    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;

    const sx = crop.x * scaleX;
    const sy = crop.y * scaleY;
    const sw = crop.width * scaleX;
    const sh = crop.height * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const ext = outputType === "image/png" ? "png" : "jpg";
        const file = new File([blob], `cropped.${ext}`, { type: outputType });
        onCrop(file);
      },
      outputType,
      outputQuality
    );
  };

  const bgOverlay = darkMode ? "bg-black/80" : "bg-black/70";
  const modalBg = darkMode ? "bg-[#2a2a2a]" : "bg-white";
  const textColor = darkMode ? "text-white" : "text-gray-900";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6">
      <div className={`absolute inset-0 ${bgOverlay}`} onClick={onCancel} />
      <div className={`relative ${modalBg} rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          <h3 className={`font-semibold text-lg ${textColor}`}>Recadrer l'image</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors">
            <X className={`w-5 h-5 ${darkMode ? "text-white/70" : "text-gray-500"}`} />
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative overflow-hidden bg-black"
          style={{ height: "min(60vh, 500px)", minHeight: 250 }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Image a recadrer"
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
            className="absolute select-none"
            style={{
              left: displaySize.offsetX,
              top: displaySize.offsetY,
              width: displaySize.width ? displaySize.width : undefined,
              height: displaySize.height ? displaySize.height : undefined,
              ...(!displaySize.width && { maxWidth: "100%", maxHeight: "100%", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }),
            }}
            draggable={false}
          />

          {imageLoaded && (
            <div
              className="absolute inset-0"
              style={{
                left: displaySize.offsetX,
                top: displaySize.offsetY,
                width: displaySize.width,
                height: displaySize.height,
                right: "auto",
                bottom: "auto",
              }}
            >
              {/* Dark overlay with crop cutout */}
              {circular ? (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: displaySize.width, height: displaySize.height }}>
                  <defs>
                    <mask id="circle-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <ellipse
                        cx={crop.x + crop.width / 2}
                        cy={crop.y + crop.height / 2}
                        rx={crop.width / 2}
                        ry={crop.height / 2}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#circle-mask)" />
                  <ellipse
                    cx={crop.x + crop.width / 2}
                    cy={crop.y + crop.height / 2}
                    rx={crop.width / 2}
                    ry={crop.height / 2}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <div
                  className="absolute inset-0 bg-black/50 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 0% 100%,
                      ${(crop.x / displaySize.width) * 100}% 100%,
                      ${(crop.x / displaySize.width) * 100}% ${(crop.y / displaySize.height) * 100}%,
                      ${((crop.x + crop.width) / displaySize.width) * 100}% ${(crop.y / displaySize.height) * 100}%,
                      ${((crop.x + crop.width) / displaySize.width) * 100}% ${((crop.y + crop.height) / displaySize.height) * 100}%,
                      ${(crop.x / displaySize.width) * 100}% ${((crop.y + crop.height) / displaySize.height) * 100}%,
                      ${(crop.x / displaySize.width) * 100}% 100%,
                      100% 100%, 100% 0%
                    )`,
                  }}
                />
              )}

              {/* Crop area (border shown only for non-circular) */}
              <div
                className={`absolute ${circular ? '' : 'border-2 border-white'}`}
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                }}
              >
                {/* Grid lines (only for non-circular) */}
                {!circular && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                  </div>
                )}

                {/* Move area */}
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={(e) => handlePointerDown(e, "move")}
                  onTouchStart={(e) => handlePointerDown(e, "move")}
                />

                {/* Corner handles */}
                {(["nw", "ne", "sw", "se"] as const).map((corner) => {
                  const isTop = corner.includes("n");
                  const isLeft = corner.includes("w");
                  return (
                    <div
                      key={corner}
                      className="absolute w-10 h-10 z-10"
                      style={{
                        top: isTop ? -5 : "auto",
                        bottom: isTop ? "auto" : -5,
                        left: isLeft ? -5 : "auto",
                        right: isLeft ? "auto" : -5,
                        cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                      }}
                      onMouseDown={(e) => handlePointerDown(e, corner)}
                      onTouchStart={(e) => handlePointerDown(e, corner)}
                    >
                      {/* Visual handle */}
                      <div
                        className="absolute bg-white rounded-full shadow-md"
                        style={{
                          width: 14,
                          height: 14,
                          top: isTop ? 0 : "auto",
                          bottom: isTop ? "auto" : 0,
                          left: isLeft ? 0 : "auto",
                          right: isLeft ? "auto" : 0,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-4 border-t ${darkMode ? "border-white/10" : "border-gray-200"}`}>
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              darkMode ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Reinitialiser
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                darkMode ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1271FF] text-white rounded-xl text-sm font-medium hover:bg-[#0d5dd8] transition-colors"
            >
              <Check className="w-4 h-4" />
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
