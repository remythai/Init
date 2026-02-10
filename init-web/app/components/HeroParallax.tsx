"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function HeroParallax() {
  const sectionRef = useRef<HTMLElement>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.bottom > 0) {
        setOffsetY(window.scrollY * 0.4);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="h-screen flex items-end overflow-hidden relative"
    >
      <Image
        src="/bgLanding.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        style={{ transform: `translateY(${offsetY}px)` }}
      />
      <div className="absolute inset-0 bg-black/20" />

      <h1 className="font-poppins text-3xl md:text-4xl lg:text-5xl leading-[1.3] font-semibold text-white relative z-10 px-28 md:px-52 pb-44 md:pb-52">
        Là où tout commence
        <motion.span
          id="hero-dot"
          className="text-[#1271FF]"
          animate={splashDone ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
          transition={splashDone ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          .
        </motion.span>
      </h1>
    </section>
  );
}
