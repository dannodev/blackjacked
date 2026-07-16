"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wordmark } from "@/components/brand/wordmark";
import { Bolt } from "@/components/brand/wordmark";

import { Variants } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} satisfies Variants;
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
} satisfies Variants;

export default function DashboardPage() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={item}>
        <p className="text-sm text-muted-foreground">Today</p>
        <h1 className="font-heading text-2xl font-bold">Phase 0 ready</h1>
      </motion.div>

      <motion.p
        variants={item}
        className="text-sm text-muted-foreground"
      >
        Brand theme, auth, and app shell are live. The Deficit Ring lands in Phase 1.
      </motion.p>

      <motion.div variants={item}>
        <Card className="overflow-hidden rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-base">
              <Bolt className="size-4 text-[var(--lime)]" />
              BlackJacked identity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dark near-black canvas, neon-lime accents, Inter + Space Grotesk,
            motion-rich and installable. You&apos;re looking at it.
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-2">
        <Wordmark size="text-lg" />
        <span className="text-xs text-muted-foreground">v0.1 · Phase 0</span>
      </motion.div>
    </motion.div>
  );
}