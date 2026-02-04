"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authService } from "../services/auth.service";

export default function Navbar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-3 md:px-12 py-2 md:py-4 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/initLogoGray.png"
            alt="Init Logo"
            width={200}
            height={80}
            className="h-10 md:h-14 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-white px-3 md:px-6 py-2 md:py-3 text-xs md:text-base transition-colors"
            >
              Déconnexion
            </button>
          )}
          <Link
            href={isAuthenticated ? "/events" : "/auth"}
            className="bg-white hover:bg-gray-100 text-[#303030] px-3 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-base transition-colors"
          >
            {isAuthenticated ? "Accéder" : "Commencer"}
          </Link>
        </div>
      </div>
    </header>
  );
}
