"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { FoodLog } from "@/components/log/food-log";
import { ExerciseLogForm } from "@/components/log/exercise-log";
import { useSearchParams } from "next/navigation";

export default function LogPage() {
  const params = useSearchParams();
  const initial = (params.get("type") as "food" | "exercise") || "food";
  const [tab, setTab] = useState<"food" | "exercise">(initial);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Quick log</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "food" | "exercise")}>
        <TabsList className="w-full">
          <TabsTrigger value="food" className="flex-1">
            Food
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex-1">
            Workout
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {tab === "food" ? <FoodLog /> : <ExerciseLogForm />}
        </div>
      </Tabs>
    </div>
  );
}