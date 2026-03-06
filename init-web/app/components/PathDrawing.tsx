"use client";

import { motion } from "motion/react";

const SWOOSH_PATH = "M5245 3361 c-396 -207 -706 -291 -1075 -292 -175 0 -271 9 -465 43 -154 28 -342 30 -434 4 -127 -35 -245 -102 -526 -301 -213 -150 -378 -210 -559 -203 -82 3 -111 9 -157 30 -58 27 -139 92 -139 112 0 6 29 28 65 49 192 112 345 292 345 405 0 74 -91 152 -176 152 -113 0 -260 -131 -307 -274 -22 -64 -22 -200 -1 -262 8 -25 14 -47 12 -49 -2 -2 -44 -16 -93 -31 -83 -26 -104 -28 -260 -28 -151 -1 -178 2 -245 22 -280 88 -483 294 -575 582 -20 64 -31 78 -45 64 -7 -7 -4 -33 11 -80 118 -381 458 -634 854 -634 108 0 253 25 325 57 l43 18 56 -55 c112 -111 254 -144 449 -104 157 32 253 83 576 308 139 96 265 162 362 186 110 28 224 26 444 -11 243 -40 505 -49 690 -25 272 36 561 134 855 290 108 57 140 84 110 92 -5 2 -68 -28 -140 -65z m-3024 -80 c31 -31 39 -46 39 -75 0 -57 -38 -125 -120 -210 -69 -73 -237 -196 -266 -196 -21 0 -38 71 -38 160 0 75 4 94 31 153 37 77 113 159 176 187 23 11 64 20 91 20 43 0 53 -4 87 -39z";

export default function PathDrawing() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.0"
            viewBox="0 0 600 600"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "80vw", height: "auto", transform: "rotate(-20deg)" }}
        >
            <g transform="translate(0,600) scale(0.1,-0.1)">
                {/* Fill fades in after outline is partially drawn */}
                <motion.path
                    d={SWOOSH_PATH}
                    fill="#1271ff"
                    stroke="none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                />
                {/* Outline draws following the shape */}
                <motion.path
                    d={SWOOSH_PATH}
                    fill="none"
                    stroke="#1271ff"
                    strokeWidth="30"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: "easeOut" }}
                />
            </g>
        </svg>
    )
}
