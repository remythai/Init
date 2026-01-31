"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Calendar, MessageCircle } from "lucide-react";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";

interface BottomNavigationProps {
  userType?: "user" | "orga" | null;
}

export default function BottomNavigation({ userType }: BottomNavigationProps) {
  const pathname = usePathname();
  const { hasUnreadGeneral: hasUnreadMessages } = useUnreadMessagesContext();

  // Only show for users, not organizers
  if (userType === "orga") return null;

  // Don't show on specific event pages (they have their own navigation)
  const eventDetailPattern = /^\/events\/[^/]+\/.+$/;
  if (eventDetailPattern.test(pathname)) return null;

  // Also don't show on event detail page itself (e.g., /events/123)
  const eventIdPattern = /^\/events\/[^/]+$/;
  const isEventDetailPage = eventIdPattern.test(pathname) && pathname !== "/events";
  if (isEventDetailPage) return null;

  const tabs = [
    {
      name: "Profil",
      subtitle: "Général",
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
      showBadge: false,
    },
    {
      name: "Événements",
      subtitle: null,
      href: "/events",
      icon: Calendar,
      isActive: pathname === "/events",
      showBadge: false,
    },
    {
      name: "Messages",
      subtitle: "Général",
      href: "/messages",
      icon: MessageCircle,
      isActive: pathname === "/messages",
      showBadge: hasUnreadMessages,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#252525] border-t border-white/10 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              tab.isActive
                ? "text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            <div className="relative">
              <tab.icon className={`w-6 h-6 ${tab.isActive ? "text-[#1271FF]" : ""}`} />
              {tab.showBadge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1271FF] rounded-full" />
              )}
            </div>
            <span className="text-xs mt-1">{tab.name}</span>
            {tab.subtitle && (
              <span className="text-[10px] text-white/40">{tab.subtitle}</span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
