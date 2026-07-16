"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodLog } from "@/components/log/food-log";
import { AiFoodLog } from "@/components/log/ai-food-log";
import { useSearchParams } from "next/navigation";

type Tab = "food" | "ai";

export default function LogPage() {
  const params = useSearchParams();
  const requested = params.get("type");
  const initial = requested === "ai" ? "ai" : "food";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Track</p>
        <h1 className="font-heading text-3xl font-extrabold">Quick log</h1>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="food" className="flex-1">
            Food
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI food
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {tab === "food" && <FoodLog />}
          {tab === "ai" && <AiFoodLog />}
        </div>
      </Tabs>
    </div>
  );
}
