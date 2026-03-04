"use client";

import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, MessageCircle, User, ArrowLeft } from "lucide-react";
import { useUnreadMessagesContext } from "../../../contexts/UnreadMessagesContext";
import { authService } from "../../../services/auth.service";
import ThemeToggle from "../../../components/ThemeToggle";
import DesktopNav from "../../../components/DesktopNav";

export default function EnvironmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const handleLogout = async () => {
    await authService.logout();
    router.push("/");
  };
  const { hasUnreadForEvent } = useUnreadMessagesContext();
  const hasUnreadMessages = hasUnreadForEvent(eventId);

  // Check if viewing a conversation on messages page (hide nav on mobile)
  const isInConversation = pathname.includes("/messages") && searchParams.get("match");

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
    <div className="h-screen bg-page flex flex-col overflow-hidden">
      {/* Header - hidden on mobile when in conversation */}
      <header className={`flex-shrink-0 ${isInConversation ? "hidden md:block" : ""}`}>
        <div className="absolute inset-x-0 top-0 bg-page pointer-events-none h-0" />
        <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="p-1.5 rounded-lg hover:bg-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <Link href="/">
              <Image src="/LogoPng.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto dark:hidden" />
              <Image src="/logo.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto hidden dark:block" />
            </Link>
          </div>
          <DesktopNav />
          <div className="flex items-center gap-3 md:gap-4">
            <div className="md:hidden"><ThemeToggle /></div>
            <button
              onClick={handleLogout}
              className="font-poppins text-sm text-secondary hover:text-primary transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>

      {/* Bottom Navigation - hidden on mobile when in conversation */}
      <nav className={`flex-shrink-0 bg-card border-t border-border md:hidden ${isInConversation ? "hidden" : ""}`}>
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                tab.isActive
                  ? "text-primary"
                  : "text-muted hover:text-secondary"
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
