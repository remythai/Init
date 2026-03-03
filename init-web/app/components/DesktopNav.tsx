"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageCircle, User } from "lucide-react";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";

interface DesktopNavProps {
  variant?: "light" | "dark";
}

export default function DesktopNav({ variant = "light" }: DesktopNavProps) {
  const pathname = usePathname();
  const { hasUnreadGeneral: hasUnreadMessages } = useUnreadMessagesContext();

  const links = [
    { name: "Événements", href: "/events", icon: Calendar, isActive: pathname === "/events" },
    { name: "Messages", href: "/messages", icon: MessageCircle, isActive: pathname === "/messages", showBadge: hasUnreadMessages },
    { name: "Profil", href: "/profile", icon: User, isActive: pathname === "/profile" },
  ];

  const isLight = variant === "light";

  return (
    <nav className="hidden md:flex items-center gap-10">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className={`relative flex items-center gap-2 text-base font-medium transition-colors ${
            link.isActive
              ? isLight
                ? "text-[#303030]"
                : "text-white"
              : isLight
                ? "text-[#303030]/50 hover:text-[#303030]"
                : "text-white/50 hover:text-white"
          }`}
        >
          <link.icon className="w-4 h-4" />
          {link.name}
          {link.showBadge && (
            <span className="absolute -top-1 -right-2 w-2 h-2 bg-[#1271FF] rounded-full" />
          )}
        </Link>
      ))}
    </nav>
  );
}
