"use client";

import { useEffect, useRef, useState } from "react";
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
  const targetDashoffset = CIRC * (1 - fraction);
  const [dashoffset, setDashoffset] = useState(CIRC);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDashoffset(targetDashoffset));
    return () => cancelAnimationFrame(frame);
  }, [targetDashoffset]);

  const dim = size === "lg" ? 238 : 190;

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
          stroke="rgba(255,255,255,0.075)"
          strokeWidth="12"
        />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          className="deficit-ring-progress"
          style={{ strokeDashoffset: dashoffset, filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-5xl font-extrabold tracking-normal text-foreground">
          <AnimatedNumber value={remaining} />
        </span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
      <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
        <Stat label="In" value={inToday} />
        <Stat label="Burn" value={outActivity} />
        <Stat label="TDEE" value={tdee} />
      </div>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    const start = performance.now();
    const duration = 800;
    let frame = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{Math.round(display).toLocaleString()}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/[0.045] px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-lg font-bold">{Math.round(value)}</p>
    </div>
  );
}
