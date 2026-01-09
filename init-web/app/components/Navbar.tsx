import Image from "next/image";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 md:px-12 py-4 md:py-6 flex items-center justify-between">
        <Image
          src="/initLogoGray.png"
          alt="Init Logo"
          width={200}
          height={80}
          className="h-20 w-auto"
        />
        <button className="bg-white hover:bg-gray-100 text-[#303030] px-4 md:px-6 py-3 md:py-5 rounded-full text-sm md:text-base">
          Commencer
        </button>
      </div>
    </header>
  );
}
