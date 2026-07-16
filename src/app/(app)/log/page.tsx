"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";

type Tab = "menu" | "ai" | "search";

const FoodLog = dynamic(
  () => import("@/components/log/food-log").then((module) => module.FoodLog),
  { loading: () => <LogPanelSkeleton />, ssr: false },
);

const AiFoodLog = dynamic(
  () => import("@/components/log/ai-food-log").then((module) => module.AiFoodLog),
  { loading: () => <LogPanelSkeleton />, ssr: false },
);

export default function LogPage() {
  const params = useSearchParams();
  const requested = params.get("type");
  const initial = requested === "ai" ? "ai" : requested === "search" ? "search" : "menu";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Track</p>
        <h1 className="font-heading text-3xl font-extrabold">Quick log</h1>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="menu" className="flex-1">
            Your Menu
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI Macros
          </TabsTrigger>
          <TabsTrigger value="search" className="flex-1">
            Search Food
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {tab === "menu" && <FoodLog mode="menu" />}
          {tab === "ai" && <AiFoodLog />}
          {tab === "search" && <FoodLog mode="search" />}
        </div>
      </Tabs>
    </div>
  );
}

function LogPanelSkeleton() {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="h-4 w-1/3 animate-pulse rounded-full bg-white/10" />
      <div className="h-24 animate-pulse rounded-3xl bg-white/[0.06]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-12 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
    </div>
  );
}
