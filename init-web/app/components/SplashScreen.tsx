"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  animate as fmAnimate,
} from "framer-motion";

export default function SplashScreen({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<"logo" | "expand" | "fade" | "done">(
    "logo"
  );
  const dotRef = useRef<HTMLSpanElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const radius = useMotionValue(0);
  const originRef = useRef("50% 50%");

  useEffect(() => {
    return radius.on("change", (r) => {
      if (circleRef.current) {
        circleRef.current.style.clipPath = `circle(${r}px at ${originRef.current})`;
      }
    });
  }, [radius]);

  useEffect(() => {
    // Expand blue circle from the dot position
    const t1 = setTimeout(() => {
      if (dotRef.current) {
        const rect = dotRef.current.getBoundingClientRect();
        originRef.current = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
      }
      setPhase("expand");
      const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 2;
      fmAnimate(radius, maxRadius, {
        duration: 1,
        ease: [0.4, 0, 0.2, 1],
      });
    }, 2500);

    // Fade everything out to reveal hero
    const t2 = setTimeout(() => setPhase("fade"), 3000);

    // Done
    const t3 = setTimeout(() => setPhase("done"), 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [radius]);

  return (
    <>
      {children}
      {phase !== "done" && (
        <div
          className="fixed inset-0 z-[100]"
          style={{
            opacity: phase === "fade" ? 0 : 1,
            transition: phase === "fade" ? "opacity 0.4s ease-out" : "none",
          }}
        >
          {/* Grey background */}
          <div className="absolute inset-0 bg-[#303030]" />

          {/* Logo text — between grey and blue so the circle covers it */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-baseline"
            >
              <span
                className="text-white text-7xl md:text-9xl font-semibold"
                style={{ fontFamily: "'ZT Grafton', serif" }}
              >
                Init
              </span>
              <motion.span
                ref={dotRef}
                className="text-[#1271FF] text-7xl md:text-9xl font-semibold"
                style={{ fontFamily: "'ZT Grafton', serif" }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                .
              </motion.span>
            </motion.div>
          </div>

          {/* Blue circle expanding from dot — on top of text, covers it */}
          <div
            ref={circleRef}
            className="absolute inset-0 bg-[#1271FF]"
            style={{ clipPath: "circle(0px at 50% 50%)" }}
          />
        </div>
      )}
    </>
  );
}
