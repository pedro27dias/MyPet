"use client";

import { motion } from "motion/react";

/** Check que se desenha (círculo cresce + traço do ✓). */
export function AnimatedCheck({ size = 96 }: { size?: number }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 100" initial="hidden" animate="shown" aria-hidden>
      <motion.circle
        cx="50"
        cy="50"
        r="46"
        fill="var(--success)"
        variants={{ hidden: { scale: 0 }, shown: { scale: 1 } }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
        style={{ originX: "50%", originY: "50%" }}
      />
      <motion.path
        d="M30 52 L44 66 L71 37"
        fill="none"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
        transition={{ delay: 0.25, duration: 0.35, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
