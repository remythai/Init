"use client";

import { motion } from "framer-motion";

export default function HeroThread() {
  return (
    <svg
      className="hidden md:block absolute top-0 left-0 w-full h-full z-[5] pointer-events-none"
      viewBox="0 0 1200 800"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <motion.path
        d="M 155,590
           C 200,640 300,660 380,645
           C 460,630 500,580 490,530
           C 480,480 440,465 420,490
           C 400,515 420,555 460,565
           C 500,575 620,540 750,490"
        stroke="#1271FF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: {
            duration: 1.5,
            ease: "easeInOut",
            delay: 0.6,
          },
          opacity: {
            duration: 0.2,
            delay: 0.6,
          },
        }}
      />
    </svg>
  );
}
