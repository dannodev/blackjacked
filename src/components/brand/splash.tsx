"use client";

import { motion } from "framer-motion";
import { Wordmark } from "./wordmark";

export function BrandSplash({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          : "flex flex-col items-center justify-center"
      }
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="relative h-32 w-32"
      >
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--card)"
            strokeWidth="10"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--lime)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" as const }}
          />
        </svg>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 14 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="h-9 w-9 text-[var(--lime)]">
            <path d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2Z" fill="currentColor" />
          </svg>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-6"
      >
        <Wordmark size="text-3xl" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        burn the deficit.
      </motion.p>
    </div>
  );
}