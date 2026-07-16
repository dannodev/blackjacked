"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  phase,
  blurb,
  icon,
}: {
  title: string;
  phase: string;
  blurb: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      <Card className="mt-4 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--rosso)]/10 text-[var(--rosso)]">
            {icon}
          </div>
          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--rosso)]">
            {phase}
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">{blurb}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}