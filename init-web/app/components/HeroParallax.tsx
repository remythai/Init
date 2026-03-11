"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { authService } from "../services/auth.service";
import { useLang } from "../contexts/LangContext";

export default function HeroParallax() {
  const [splashDone, setSplashDone] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    const timer = setTimeout(() => setSplashDone(true), 3400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#303030]">
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
          <span className="flex flex-wrap justify-center gap-2">
            <span className="inline-block bg-[#FF4D6A] text-white px-4 md:px-5 rounded-full pb-1">{t.hero.love}</span>
            <span className="inline-block bg-[#34D399] text-white px-4 md:px-5 rounded-full pb-1">{t.hero.friendship}</span>
            <span className="inline-block bg-[#1271FF] text-white px-4 md:px-7 rounded-full pb-1">{t.hero.pro}</span>
          </span>
          {t.hero.line3}
        </motion.h1>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={splashDone ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-3"
        >
          {/* Download button - mobile only, visible when authenticated */}
          {isAuthenticated && (
            <a
              href="/init.apk"
              download
              className="md:hidden inline-flex items-center gap-2 font-poppins font-semibold text-sm text-white bg-transparent border border-white hover:bg-white/10 px-6 py-4 rounded-full transition-all duration-300"
            >
              {t.navbar.download}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.226a.75.75 0 0 0-1.046-.177l-1.867 1.302A8.962 8.962 0 0 0 12 2.726a8.96 8.96 0 0 0-2.61.625L7.523 2.05a.75.75 0 1 0-.869 1.222l1.548 1.08A8.987 8.987 0 0 0 3 12.226v.75h18v-.75a8.987 8.987 0 0 0-5.202-8.174l1.548-1.08a.75.75 0 0 0 .177-1.046zM8.25 10.226a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm7.5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM3 14.476v3.75A3.75 3.75 0 0 0 6.75 22h10.5A3.75 3.75 0 0 0 21 18.226v-3.75H3z"/>
              </svg>
            </a>
          )}

          <Link
            href={isAuthenticated ? "/events" : "/auth"}
            className="group inline-flex items-center gap-2.5 font-poppins font-semibold text-sm md:text-base text-white bg-[#1271FF] hover:bg-[#0f5fd6] hover:shadow-lg hover:shadow-[#1271FF]/25 px-8 md:px-10 py-4 md:py-4.5 rounded-full transition-all duration-300"
          >
            <span className="md:hidden">{isAuthenticated ? t.navbar.access : t.hero.cta}</span>
            <span className="hidden md:inline">{t.hero.cta}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
