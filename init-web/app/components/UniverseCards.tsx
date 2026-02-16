"use client";

import { Heart, Users, Briefcase } from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState } from "react";

const universes = [
  {
    icon: Heart,
    title: "Amour",
    description: "Trouvez l'amour autour de passions communes",
    color: "#FF4D6A",
    gradient: "from-[#FF4D6A] to-[#FF6B81]",
  },
  {
    icon: Users,
    title: "Amitié",
    description: "Agrandissez votre cercle social autour d'activités",
    color: "#34D399",
    gradient: "from-[#34D399] to-[#6EE7B7]",
  },
  {
    icon: Briefcase,
    title: "Business",
    description: "Développez votre réseau professionnel",
    color: "#1271FF",
    gradient: "from-[#1271FF] to-[#60A5FA]",
  },
];

function UniverseCard({
  universe,
  index,
}: {
  universe: (typeof universes)[number];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    rotateX.set(((y - centerY) / centerY) * -8);
    rotateY.set(((x - centerX) / centerX) * 8);

    setGlowPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  const Icon = universe.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformPerspective: 800,
        }}
        className="relative cursor-pointer group"
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: isHovered ? 0.15 : 0,
            background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${universe.color}, transparent 60%)`,
          }}
        />

        {/* Border gradient */}
        <div
          className="absolute inset-0 rounded-3xl transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: isHovered ? 1 : 0,
            padding: "1px",
            background: `linear-gradient(135deg, ${universe.color}40, transparent 50%, ${universe.color}20)`,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
          }}
        />

        <div
          className={`bg-[#303030] border rounded-3xl p-8 md:p-12 transition-all duration-300 h-full flex flex-col relative overflow-hidden ${
            isHovered ? "border-transparent" : "border-white/5"
          }`}
        >
          {/* Icon */}
          <motion.div
            animate={
              isHovered
                ? { scale: 1.1, rotate: 5 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-6 md:mb-8 transition-colors duration-300"
            style={{
              backgroundColor: isHovered
                ? `${universe.color}20`
                : "rgba(255,255,255,0.05)",
            }}
          >
            <Icon
              className="w-6 h-6 md:w-8 md:h-8 transition-colors duration-300"
              style={{ color: isHovered ? universe.color : "#ffffff" }}
            />
          </motion.div>

          <h3 className="font-poppins text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
            {universe.title}
          </h3>
          <p className="font-roboto text-white/60 text-base md:text-lg leading-relaxed">
            {universe.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UniverseCards() {
  return (
    <section className="py-16 md:py-32 px-4 md:px-12 bg-[#282828]">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-poppins text-3xl md:text-5xl lg:text-6xl font-bold text-white">
            Trois univers
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {universes.map((universe, index) => (
            <UniverseCard key={universe.title} universe={universe} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
