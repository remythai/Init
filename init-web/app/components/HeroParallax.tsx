"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { authService } from "../services/auth.service";
import { useLang } from "../contexts/LangContext";

export default function HeroParallax() {
  const sectionRef = useRef<HTMLElement>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
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
    <section ref={sectionRef} className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#303030]">
      {/* Background image */}
      <Image
        src="/bgLanding.jpg"
        alt=""
        fill
        priority
        className="absolute inset-0 object-cover"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-7xl mx-auto">
        {/* Headline */}
        <motion.h1
          className="font-poppins text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.5] mb-8 tracking-tight"
          initial={{ opacity: 0, y: 25 }}
          animate={splashDone ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t.hero.line1}
          <br />
          <span className="inline-block bg-[#FF4D6A] text-white px-5 rounded-full mx-1 pb-1 italic">{t.hero.love}</span>
          <span className="inline-block bg-[#34D399] text-white px-5 rounded-full mx-1 pb-1 italic">{t.hero.friendship}</span>
          <span className="inline-block bg-[#1271FF] text-white px-7 rounded-full mx-1 pb-1 italic">{t.hero.pro}</span>
          <br />
          {t.hero.line3}
        </motion.h1>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={splashDone ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href={isAuthenticated ? "/events" : "/auth"}
            className="group inline-flex items-center gap-2.5 font-poppins font-semibold text-sm md:text-base text-white bg-[#1271FF] hover:bg-[#0f5fd6] hover:shadow-lg hover:shadow-[#1271FF]/25 px-8 md:px-10 py-4 md:py-4.5 rounded-full transition-all duration-300"
          >
            {t.hero.cta}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
