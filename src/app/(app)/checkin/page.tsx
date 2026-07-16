"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
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
      id: crypto.randomUUID(),
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
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Weekly check-in</h1>
        <p className="text-sm text-muted-foreground">
          Track your progress. Measurements are optional.
        </p>
      </div>

      <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Scale className="size-4 text-[var(--lime)]" />
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
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-[var(--lime)]/40">
              <Camera className="size-5" />
              {photoUrl ? "Photo selected" : "Tap to upload"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Progress"
                className="h-32 w-full rounded-xl object-cover"
              />
            )}
          </div>

          <Button
            onClick={save}
            className="w-full bg-[var(--lime)] text-[var(--ink)] font-semibold hover:bg-[var(--lime)]/90"
          >
            Save check-in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}