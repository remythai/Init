"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Calendar, MessageCircle } from "lucide-react";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";

interface BottomNavigationProps {
  userType?: "user" | "orga" | null;
  hidden?: boolean;
}

export default function BottomNavigation({ userType, hidden }: BottomNavigationProps) {
  const pathname = usePathname();
  const { hasUnreadGeneral: hasUnreadMessages } = useUnreadMessagesContext();

  if (userType === "orga") return null;

  const eventDetailPattern = /^\/events\/[^/]+(\/.*)?$/;
  if (eventDetailPattern.test(pathname)) return null;

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
    <div className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center md:hidden ${hidden ? "hidden" : ""}`}>
      <nav className="flex items-center w-full bg-card border-t border-border rounded-none px-10 pt-1.5" style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}>
        {tabs.map((tab) => (
          <Link
            key={tab.name}
            href={tab.href}
            className={`flex flex-col items-center flex-1 px-7 py-1.5 transition-colors ${
              tab.isActive
                ? "text-primary"
                : "text-muted hover:text-primary"
            }`}
          >
            <div className="relative">
              <tab.icon className={`w-6 h-6 ${tab.isActive ? "text-[#1271FF]" : ""}`} />
              {tab.showBadge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#1271FF] rounded-full" />
              )}
            </div>
            <span className="text-xs mt-0.5">{tab.name}</span>
            {tab.subtitle && (
              <span className="text-[10px] text-secondary">{tab.subtitle}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
