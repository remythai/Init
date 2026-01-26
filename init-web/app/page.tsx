import { Heart, Users, Briefcase, ArrowRight } from "lucide-react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#303030]">
      <Navbar />

      {/* Hero - Full Height */}
      <section className="min-h-screen flex items-center justify-center px-4 md:px-12 pt-20 md:pt-24">
        <div className="max-w-[900px] w-full text-center">
          <div className="space-y-6 md:space-y-8">
            <div>
              <span className="text-xs md:text-sm font-poppins tracking-widest text-[#1271FF] uppercase">
                Rencontres authentiques
              </span>
            </div>
            <h1 className="font-poppins text-4xl md:text-6xl lg:text-[5rem] leading-[0.95] font-bold text-white">
              Des événements.<br />
              Des personnes.<br />
              Des connexions.
            </h1>
            <p className="font-roboto text-base md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed px-4 md:px-0">
              Init réinvente la rencontre en créant des moments réels autour d'événements qui vous ressemblent.
            </p>
            <div className="flex justify-center pt-2 md:pt-4">
              <Link
                href="/auth"
                className="bg-[#1271FF] hover:bg-[#0d5dd8] text-white px-6 md:px-8 py-4 md:py-6 rounded-full text-base md:text-lg group flex items-center transition-colors"
              >
                S'inscrire gratuitement
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Three types - Minimal cards */}
      <section className="py-16 md:py-32 px-4 md:px-12 bg-[#282828]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-10 md:mb-20">
            <h2 className="font-poppins text-3xl md:text-5xl lg:text-6xl font-bold text-white">
              Trois univers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {/* Love */}
            <div className="group cursor-pointer">
              <div className="bg-[#303030] border border-white/5 rounded-3xl p-8 md:p-12 hover:border-white/20 transition-all duration-300 h-full flex flex-col">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-white/10 transition-all">
                  <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="font-poppins text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                  Amour
                </h3>
                <p className="font-roboto text-white/60 text-base md:text-lg leading-relaxed">
                  Trouvez l'amour autour de passions communes
                </p>
              </div>
            </div>

            {/* Friends */}
            <div className="group cursor-pointer">
              <div className="bg-[#303030] border border-white/5 rounded-3xl p-8 md:p-12 hover:border-white/20 transition-all duration-300 h-full flex flex-col">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-white/10 transition-all">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="font-poppins text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                  Amitié
                </h3>
                <p className="font-roboto text-white/60 text-base md:text-lg leading-relaxed">
                  Agrandissez votre cercle social autour d'activités
                </p>
              </div>
            </div>

            {/* Pro */}
            <div className="group cursor-pointer">
              <div className="bg-[#303030] border border-white/5 rounded-3xl p-8 md:p-12 hover:border-white/20 transition-all duration-300 h-full flex flex-col">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#1271FF]/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-[#1271FF]/20 transition-all">
                  <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-[#1271FF]" />
                </div>
                <h3 className="font-poppins text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                  Business
                </h3>
                <p className="font-roboto text-white/60 text-base md:text-lg leading-relaxed">
                  Développez votre réseau professionnel
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Simplified */}
      <section className="py-16 md:py-32 px-4 md:px-12 bg-[#303030]">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10 md:mb-20">
            <h2 className="font-poppins text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
              Simple et efficace
            </h2>
            <p className="font-roboto text-base md:text-xl text-white/60">
              En quelques étapes, commencez à rencontrer
            </p>
          </div>

          <div className="space-y-8 md:space-y-16">
            <div className="flex items-start gap-4 md:gap-8">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
                <span className="font-poppins text-xl md:text-2xl font-bold text-white">1</span>
              </div>
              <div>
                <h3 className="font-poppins text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">
                  Créez votre profil
                </h3>
                <p className="font-roboto text-base md:text-lg text-white/60">
                  Partagez vos centres d'intérêt et ce que vous cherchez
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:gap-8">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10">
                <span className="font-poppins text-xl md:text-2xl font-bold text-white">2</span>
              </div>
              <div>
                <h3 className="font-poppins text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">
                  Rejoignez un événement
                </h3>
                <p className="font-roboto text-base md:text-lg text-white/60">
                  Trouvez des événements qui correspondent à vos passions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 md:gap-8">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#1271FF] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-poppins text-xl md:text-2xl font-bold text-white">3</span>
              </div>
              <div>
                <h3 className="font-poppins text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">
                  Rencontrez
                </h3>
                <p className="font-roboto text-base md:text-lg text-white/60">
                  Connectez-vous avec les participants et vivez l'expérience
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Bold and minimal */}
      <section className="py-16 md:py-32 px-4 md:px-12 bg-[#1a1a1a] text-white border-t border-white/5">
        <div className="max-w-[1000px] mx-auto text-center">
          <h2 className="font-poppins text-4xl md:text-5xl lg:text-7xl font-bold mb-6 md:mb-8 leading-tight">
            Prêt à commencer ?
          </h2>
          <p className="font-roboto text-lg md:text-2xl text-white/60 mb-8 md:mb-12 max-w-2xl mx-auto px-4 md:px-0">
            Rejoignez des milliers de personnes qui créent des connexions authentiques
          </p>
          <Link
            href="/auth"
            className="inline-block bg-white hover:bg-gray-100 text-[#303030] px-8 md:px-12 py-5 md:py-7 rounded-full text-lg md:text-xl font-poppins font-semibold transition-colors"
          >
            S'inscrire gratuitement
          </Link>
          <p className="font-roboto text-white/40 mt-4 md:mt-6 text-sm md:text-base">
            Gratuit • Sans engagement
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}