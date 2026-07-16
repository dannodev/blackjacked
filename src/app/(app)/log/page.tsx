"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodLog } from "@/components/log/food-log";
import { AiFoodLog } from "@/components/log/ai-food-log";
import { ExerciseLogForm } from "@/components/log/exercise-log";
import { useSearchParams } from "next/navigation";

type Tab = "food" | "ai" | "exercise";

export default function LogPage() {
  const params = useSearchParams();
  const initial = (params.get("type") as Tab) || "food";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Quick log</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="food" className="flex-1">
            Food
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">
            AI food
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex-1">
            Workout
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {tab === "food" && <FoodLog />}
          {tab === "ai" && <AiFoodLog />}
          {tab === "exercise" && <ExerciseLogForm />}
        </div>
      </Tabs>
    </div>
  );
}