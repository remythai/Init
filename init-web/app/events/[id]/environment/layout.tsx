"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, MessageCircle, User, ArrowLeft } from "lucide-react";
import { useUnreadMessagesContext } from "../../../contexts/UnreadMessagesContext";

export default function EnvironmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const eventId = params.id as string;
  const { hasUnreadForEvent } = useUnreadMessagesContext();
  const hasUnreadMessages = hasUnreadForEvent(eventId);

  const tabs = [
    {
      name: "Profil",
      href: `/events/${eventId}/environment/profile`,
      icon: User,
      isActive: pathname.includes("/profile"),
      showBadge: false,
    },
    {
      name: "Découvrir",
      href: `/events/${eventId}/environment/swiper`,
      icon: Users,
      isActive: pathname.includes("/swiper"),
      showBadge: false,
    },
    {
      name: "Messages",
      href: `/events/${eventId}/environment/messages`,
      icon: MessageCircle,
      isActive: pathname.includes("/messages"),
      showBadge: hasUnreadMessages,
    },
  ];

  return (
    <div className="h-screen bg-[#303030] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#303030] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-12 md:h-16 w-auto"
            />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Retour à l'événement</span>
            <span className="md:hidden">Retour</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-[#252525] border-t border-white/10">
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
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
