import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] border-t border-white/5">
      {/* Main footer */}
      <div className="px-4 md:px-12">
        <div className="max-w-[1400px] mx-auto py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-8">
            {/* Logo + tagline */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Link href="/">
                <Image
                  src="/initLogoGray.png"
                  alt="Init Logo"
                  width={120}
                  height={48}
                  className="h-8 md:h-10 w-auto"
                />
              </Link>
              <p className="font-roboto text-sm text-white/40 max-w-xs text-center md:text-left">
                Des événements. Des personnes. Des connexions.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center md:justify-end gap-x-12 gap-y-6">
              <div>
                <h4 className="font-poppins text-xs uppercase tracking-widest text-white/30 mb-3 md:mb-4 text-center md:text-left">
                  Légal
                </h4>
                <ul className="space-y-2 text-center md:text-left">
                  <li>
                    <Link
                      href="/legal/cgu"
                      className="font-roboto text-sm text-white/50 hover:text-white transition-colors"
                    >
                      CGU
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/legal/confidentialite"
                      className="font-roboto text-sm text-white/50 hover:text-white transition-colors"
                    >
                      Confidentialité
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/legal/mentions-legales"
                      className="font-roboto text-sm text-white/50 hover:text-white transition-colors"
                    >
                      Mentions légales
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-poppins text-xs uppercase tracking-widest text-white/30 mb-3 md:mb-4 text-center md:text-left">
                  Contact
                </h4>
                <ul className="space-y-2 text-center md:text-left">
                  <li>
                    <a
                      href="mailto:antton.ducos@gmail.com"
                      className="font-roboto text-sm text-white/50 hover:text-white transition-colors"
                    >
                      antton.ducos@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-4 md:px-12 border-t border-white/5">
        <div className="max-w-[1400px] mx-auto py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-roboto text-xs text-white/30">
            © {new Date().getFullYear()} Init. Tous droits réservés.
          </p>
          <p className="font-roboto text-xs text-white/20">
            Fait avec passion à Paris
          </p>
        </div>
      </div>
    </footer>
  );
}
