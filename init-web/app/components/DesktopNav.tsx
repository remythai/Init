"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageCircle, User } from "lucide-react";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";
import ThemeToggle from "./ThemeToggle";

export default function DesktopNav() {
  const pathname = usePathname();
  const { hasUnreadGeneral: hasUnreadMessages } = useUnreadMessagesContext();

  const links = [
    { name: "Profil", href: "/profile", icon: User, isActive: pathname === "/profile" },
    { name: "Événements", href: "/events", icon: Calendar, isActive: pathname === "/events" },
    { name: "Messages", href: "/messages", icon: MessageCircle, isActive: pathname === "/messages", showBadge: hasUnreadMessages },
  ];

  return (
    <nav className="hidden md:flex items-center gap-10">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className={`relative flex items-center gap-2 text-base font-medium transition-colors ${
            link.isActive
              ? "text-primary"
              : "text-muted hover:text-primary"
          }`}
        >
          <link.icon className="w-4 h-4" />
          {link.name}
          {link.showBadge && (
            <span className="absolute -top-1 -right-2 w-2 h-2 bg-[#1271FF] rounded-full" />
          )}
        </Link>
      ))}
      <ThemeToggle />
    </nav>
  );
}
