"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { ringState } from "@/lib/types";

const R = 88;
const CIRC = 2 * Math.PI * R;

export function DeficitRing({
  remaining,
  goal,
  inToday,
  outActivity,
  tdee,
  size = "lg",
}: {
  remaining: number;
  goal: number;
  inToday: number;
  outActivity: number;
  tdee: number;
  size?: "lg" | "md";
}) {
  // consumed fraction toward the goal (cap at 1 for ring, allow overflow color)
  const consumed = Math.max(0, goal - remaining);
  const fraction = Math.min(1, goal > 0 ? consumed / goal : 1);
  const { color, label } = ringState(remaining, goal);
  const dashoffset = useMotionValue(CIRC);
  const displayRemaining = useMotionValue(0);

  useEffect(() => {
    const controls = animate(dashoffset, CIRC * (1 - fraction), {
      duration: 0.8,
      ease: "easeOut" as const,
    });
    const numControls = animate(displayRemaining, remaining, {
      duration: 0.8,
      ease: "easeOut" as const,
    });
    return () => {
      controls.stop();
      numControls.stop();
    };
  }, [fraction, remaining, dashoffset, displayRemaining]);

  const dim = size === "lg" ? 256 : 200;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: dim }}
    >
      <svg
        viewBox="0 0 200 200"
        className="-rotate-90"
        style={{ width: dim, height: dim }}
      >
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="var(--card)"
          strokeWidth="14"
        />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: dashoffset, filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-heading text-5xl font-bold text-foreground">
          <AnimatedNumber value={remaining} />
        </motion.span>
        <span className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          kcal left
        </span>
        <span
          className="mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: `${color}22`, color }}
        >
          {label}
        </span>
      </div>
      {/* mini stats under ring */}
      <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
        <Stat label="In" value={inToday} />
        <Stat label="Burn" value={outActivity} />
        <Stat label="TDEE" value={tdee} />
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: "easeOut" as const });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-lg font-semibold">{Math.round(value)}</p>
    </div>
  );
}