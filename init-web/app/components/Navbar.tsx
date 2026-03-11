"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Globe, ChevronDown } from "lucide-react";
import { authService } from "../services/auth.service";
import { useLang, Lang } from "../contexts/LangContext";

const languages: { code: Lang; label: string }[] = [
  { code: "FR", label: "Français" },
  { code: "EN", label: "English" },
  { code: "ES", label: "Español" },
];

export default function Navbar() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    router.push("/");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12">
      <div className="w-full flex items-center justify-between">
        <Link href="/">
          <Image
            src="/logoDark.svg"
            alt="Init Logo"
            width={200}
            height={80}
            className="h-15 md:h-25 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="font-poppins text-sm text-white/60 hover:text-white transition-colors"
            >
              {t.navbar.logout}
            </button>
          )}

          {/* Language selector */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 font-poppins text-xs md:text-sm text-white font-bold hover:text-white/80 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[140px]">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 font-poppins text-sm transition-colors ${
                      lang === l.code
                        ? "text-white bg-white/10"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="/init.apk"
            download
            className="hidden md:flex bg-[#4A90D9] text-white hover:bg-[#3a7bc8] font-medium px-6 py-3 rounded-full text-base transition-colors items-center gap-1.5"
          >
            {t.navbar.download}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 2.226a.75.75 0 0 0-1.046-.177l-1.867 1.302A8.962 8.962 0 0 0 12 2.726a8.96 8.96 0 0 0-2.61.625L7.523 2.05a.75.75 0 1 0-.869 1.222l1.548 1.08A8.987 8.987 0 0 0 3 12.226v.75h18v-.75a8.987 8.987 0 0 0-5.202-8.174l1.548-1.08a.75.75 0 0 0 .177-1.046zM8.25 10.226a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm7.5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM3 14.476v3.75A3.75 3.75 0 0 0 6.75 22h10.5A3.75 3.75 0 0 0 21 18.226v-3.75H3z"/>
            </svg>
          </a>

          <Link
            href={isAuthenticated ? "/events" : "/auth"}
            className="hidden md:flex bg-white text-black hover:bg-white/90 font-medium px-6 py-3 rounded-full text-base transition-colors items-center gap-1.5 group"
          >
            {isAuthenticated ? t.navbar.access : t.navbar.start}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
