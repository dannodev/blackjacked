"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodLog } from "@/components/log/food-log";
import { AiFoodLog } from "@/components/log/ai-food-log";
import { useSearchParams } from "next/navigation";

type Tab = "menu" | "ai" | "search";

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
