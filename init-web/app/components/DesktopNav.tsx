"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, MessageCircle, User, Users } from "lucide-react";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";
import ThemeToggle from "./ThemeToggle";

interface DesktopNavProps {
  eventId?: string;
}

export default function DesktopNav({ eventId }: DesktopNavProps) {
  const pathname = usePathname();
  const { hasUnreadGeneral: hasUnreadMessages, hasUnreadForEvent } = useUnreadMessagesContext();

  const links = eventId
    ? [
        { name: "Profil", href: `/events/${eventId}/environment/profile`, icon: User, isActive: pathname.includes("/profile") },
        { name: "Swiper", href: `/events/${eventId}/environment/swiper`, icon: Users, isActive: pathname.includes("/swiper") },
        { name: "Messages", href: `/events/${eventId}/environment/messages`, icon: MessageCircle, isActive: pathname.includes("/messages"), showBadge: hasUnreadForEvent(eventId) },
      ]
    : [
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
    </nav>
  );
}
