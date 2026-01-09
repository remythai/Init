import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="py-8 md:py-12 px-4 md:px-12 bg-[#1a1a1a] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-poppins font-bold text-white">Init</span>
        </div>
        <div className="flex gap-6 md:gap-12 text-sm text-white/60 font-roboto">
          <a href="#" className="hover:text-white transition-colors">Conditions</a>
          <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <p className="font-roboto text-sm text-white/40">© 2026 Init</p>
      </div>
    </footer>
  );
}
