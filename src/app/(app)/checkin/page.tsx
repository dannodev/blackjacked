"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { makeId } from "@/lib/id";
import type { WeightLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Scale } from "lucide-react";

export default function CheckInPage() {
  const profile = useStore((s) => s.profile)!;
  const addWeightLog = useStore((s) => s.addWeightLog);

  const [weight, setWeight] = useState(profile.current_weight_kg);
  const [waist, setWaist] = useState<number | "">("");
  const [chest, setChest] = useState<number | "">("");
  const [hip, setHip] = useState<number | "">("");
  const [arm, setArm] = useState<number | "">("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function save() {
    if (!weight || weight <= 0) {
      toast.error("Enter your weight");
      return;
    }
    const log: WeightLog = {
      id: makeId(),
      weight_kg: weight,
      waist_cm: typeof waist === "number" ? waist : undefined,
      chest_cm: typeof chest === "number" ? chest : undefined,
      hip_cm: typeof hip === "number" ? hip : undefined,
      arm_cm: typeof arm === "number" ? arm : undefined,
      photo_url: photoUrl,
      loggedAt: new Date().toISOString(),
    };
    addWeightLog(log);
    toast.success("Check-in saved", {
      description: `${weight} kg logged`,
    });
    setWaist("");
    setChest("");
    setHip("");
    setArm("");
    setPhotoUrl(undefined);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Progress</p>
        <h1 className="font-heading text-3xl font-extrabold">Weekly check-in</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Track your progress. Measurements are optional.
        </p>
      </div>

      <Card className="premium-panel rounded-[1.6rem]">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-base">
            <Scale className="size-4 text-[var(--rosso-light)]" />
            This week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(+e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="waist" className="text-xs">Waist (cm)</Label>
              <Input
                id="waist"
                type="number"
                step="0.5"
                placeholder="—"
                value={waist}
                onChange={(e) => setWaist(e.target.value === "" ? "" : +e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chest" className="text-xs">Chest (cm)</Label>
              <Input
                id="chest"
                type="number"
                step="0.5"
                placeholder="—"
                value={chest}
                onChange={(e) => setChest(e.target.value === "" ? "" : +e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hip" className="text-xs">Hip (cm)</Label>
              <Input
                id="hip"
                type="number"
                step="0.5"
                placeholder="—"
                value={hip}
                onChange={(e) => setHip(e.target.value === "" ? "" : +e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arm" className="text-xs">Arm (cm)</Label>
              <Input
                id="arm"
                type="number"
                step="0.5"
                placeholder="—"
                value={arm}
                onChange={(e) => setArm(e.target.value === "" ? "" : +e.target.value)}
              />
            </div>
          </div>

          {/* photo */}
          <div className="space-y-2">
            <Label className="text-xs">Progress photo (optional)</Label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.035] px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-[var(--rosso)]/40">
              <Camera className="size-5" />
              {photoUrl ? "Photo selected" : "Tap to upload"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {photoUrl && (
              <div className="relative h-32 w-full">
                <Image
                  src={photoUrl}
                  alt="Progress"
                  fill
                  className="rounded-2xl object-cover"
                />
              </div>
            )}
          </div>

          <Button
            onClick={save}
            className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
          >
            Save check-in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
