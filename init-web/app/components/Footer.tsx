import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="py-6 md:py-12 px-4 md:px-12 bg-[#1a1a1a] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col items-center gap-4 md:gap-6">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={120}
              height={48}
              className="h-8 md:h-12 w-auto"
            />
          </Link>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm text-white/60 font-roboto">
            <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/legal/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <a href="mailto:antton.ducos@gmail.com" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/5 text-center">
          <p className="font-roboto text-xs md:text-sm text-white/40">© 2026 Init</p>
        </div>
      </div>
    </footer>
  );
}
