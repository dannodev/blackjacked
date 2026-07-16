"use client";

import { motion } from "framer-motion";
import Image from "next/image";
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
      {/* Racing stripe accent at top */}
      {fullScreen && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: "linear-gradient(90deg, transparent 10%, var(--rosso) 25%, var(--rosso) 40%, transparent 45%, transparent 55%, var(--rosso) 60%, var(--rosso) 75%, transparent 85%)",
            opacity: 0.5,
          }}
        />
      )}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="relative h-28 w-28"
      >
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--rosso)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" as const }}
            style={{ filter: "drop-shadow(0 0 10px rgba(212,0,0,0.4))" }}
          />
        </svg>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 14 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Image
            src="/blackjacked-logo.png"
            alt="BlackJacked"
            width={64}
            height={64}
            className="h-14 w-14 object-contain drop-shadow-[0_0_14px_rgba(212,0,0,0.5)]"
            priority
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-5"
      >
        <Wordmark size="text-2xl" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="mt-1.5 text-xs tracking-wide text-muted-foreground"
      >
        burn the deficit.
      </motion.p>
    </div>
  );
}
