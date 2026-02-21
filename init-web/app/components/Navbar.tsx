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
      <div className="w-full py-4 md:py-6 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Init Logo"
            width={200}
            height={80}
            className="h-7 md:h-9 w-auto"
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

          <Link
            href={isAuthenticated ? "/events" : "/auth"}
            className="group inline-flex items-center gap-2 font-poppins font-semibold text-xs md:text-sm text-black bg-white hover:bg-white/90 px-5 md:px-6 py-2.5 rounded-full transition-all duration-300"
          >
            {isAuthenticated ? t.navbar.access : t.navbar.start}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
