"use client";

import Image from "next/image";

const images = [
  { src: "/profile1.png", alt: "Profil 1" },
  { src: "/profile2.png", alt: "Profil 2" },
  { src: "/profile3.png", alt: "Profil 3" },
];

export default function HeroImages() {
  return (
    <>
      {/* Desktop: static layout */}
      <div className="hidden lg:flex flex-1 items-center justify-end gap-8 min-w-0 max-h-[60vh] relative z-10">
        <div className="flex flex-col gap-8 w-[36%]">
          <div className="hero-img-top hero-img-delay-1">
            <Image
              src="/profile1.png"
              alt="Profil 1"
              width={810}
              height={1080}
              className="w-full h-auto"
            />
          </div>
          <div className="hero-img-bottom hero-img-delay-2 ml-10">
            <Image
              src="/profile2.png"
              alt="Profil 2"
              width={810}
              height={1080}
              className="w-full h-auto"
            />
          </div>
        </div>
        <div className="flex flex-col gap-8 mt-12 w-[36%]">
          <div className="hero-img-right hero-img-delay-3">
            <Image
              src="/profile3.png"
              alt="Profil 3"
              width={810}
              height={1080}
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>

    </>
  );
}
