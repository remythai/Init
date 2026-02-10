"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authService } from "../services/auth.service";

export default function Navbar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    router.push("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-52">
      <div className="max-w-[1800px] mx-auto py-2 md:py-4 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Init Logo"
            width={200}
            height={80}
            className="h-8 md:h-10 w-auto"
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
            className="hover:underline text-white font-semibold px-3 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-base transition-colors"
          >
            {isAuthenticated ? "Accéder" : "Commencer"}
          </Link>
        </div>
      </div>
    </header>
  );
}
