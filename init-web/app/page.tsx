import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HeroParallax from "./components/HeroParallax";
import SplashScreen from "./components/SplashScreen";

export default function Home() {
  return (
    <SplashScreen>
      <div className="min-h-screen bg-[#303030]">
        <Navbar />
        <HeroParallax />
        <Footer />
      </div>

    </SplashScreen>
  );
}
