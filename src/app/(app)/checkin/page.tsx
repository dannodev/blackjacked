"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { makeId } from "@/lib/id";
import type { WeightLog } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { deleteSupabaseWeightLog, saveSupabaseWeightLog } from "@/lib/supabase/weight-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Scale, Trash2 } from "lucide-react";
import { trackProductEvent } from "@/lib/product-analytics";

export default function CheckInPage() {
  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;
  const addWeightLog = useStore((s) => s.addWeightLog);
  const deleteWeightLog = useStore((s) => s.deleteWeightLog);
  const weightLogs = useStore((s) => s.weightLogs);

  const [weight, setWeight] = useState(profile.current_weight_kg);
  const [waist, setWaist] = useState<number | "">("");
  const [chest, setChest] = useState<number | "">("");
  const [hip, setHip] = useState<number | "">("");
  const [arm, setArm] = useState<number | "">("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressPhoto(file);
      setPhotoUrl(compressed.previewUrl);
      setPhotoBlob(compressed.blob);
      toast.success("Photo ready", {
        description: "Compressed and ready for cloud sync.",
      });
    } catch {
      toast.error("Could not process photo");
    }
  }

  async function save() {
    if (!weight || weight <= 0) {
      toast.error("Enter your weight");
      return;
    }

    setSaving(true);
    let uploadedPhotoUrl = photoUrl;
    let uploadedPhotoId: string | undefined;

    if (photoBlob) {
      try {
        const uploaded = await uploadCloudPhoto(photoBlob);
        uploadedPhotoUrl = uploaded.url;
        uploadedPhotoId = uploaded.publicId;
      } catch (error) {
        toast.info("Cloud photo upload skipped", {
          description:
            error instanceof Error ? error.message : "Saved locally for now.",
        });
      }
    }

    const log: WeightLog = {
      id: makeId(),
      weight_kg: weight,
      waist_cm: typeof waist === "number" ? waist : undefined,
      chest_cm: typeof chest === "number" ? chest : undefined,
      hip_cm: typeof hip === "number" ? hip : undefined,
      arm_cm: typeof arm === "number" ? arm : undefined,
      photo_url: uploadedPhotoUrl,
      photo_public_id: uploadedPhotoId,
      loggedAt: new Date().toISOString(),
    };

    try {
      const canCloudSyncPhoto = Boolean(uploadedPhotoId);
      const remoteLog: WeightLog = {
        ...log,
        photo_url: undefined,
        photo_public_id: uploadedPhotoId,
      };
      if (user) await saveSupabaseWeightLog(user.id, remoteLog);
      addWeightLog(log);
      trackProductEvent("checkin_saved");
      toast.success("Check-in saved", {
        description: canCloudSyncPhoto
          ? `${weight} kg logged with cloud photo`
          : `${weight} kg logged`,
      });
      setWaist("");
      setChest("");
      setHip("");
      setArm("");
      setPhotoUrl(undefined);
      setPhotoBlob(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save check-in");
    } finally {
      setSaving(false);
    }
  }

  async function removeCheckIn(log: WeightLog) {
    try {
      if (log.photo_public_id) {
        const response = await fetch(
          `/api/checkin-photo?path=${encodeURIComponent(log.photo_public_id)}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("Could not remove the private photo.");
      }
      if (user) await deleteSupabaseWeightLog(log.id);
      deleteWeightLog(log.id);
      toast.success("Check-in deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete check-in");
    }
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
            <p className="text-xs text-muted-foreground">
              Photos are compressed and stored privately. Access links expire
              automatically and are renewed only for your signed-in account.
            </p>
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
            disabled={saving}
            className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
          >
            {saving ? "Saving..." : "Save check-in"}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-2" aria-labelledby="recent-checkins">
        <h2 id="recent-checkins" className="font-heading text-sm font-bold">Recent check-ins</h2>
        {[...weightLogs].reverse().slice(0, 8).map((log) => (
          <Card key={log.id} className="rounded-[1.35rem] border-white/7">
            <CardContent className="flex items-center justify-between gap-3 py-3.5">
              <div>
                <p className="font-heading font-bold">{log.weight_kg.toFixed(1)} kg</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.loggedAt).toLocaleDateString()}
                  {log.photo_public_id ? " · Private photo" : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={`Delete check-in from ${new Date(log.loggedAt).toLocaleDateString()}`}
                onClick={() => void removeCheckIn(log)}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

async function compressPhoto(file: File): Promise<{
  blob: Blob;
  previewUrl: string;
}> {
  const image = await loadImage(file);
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.72),
  );

  if (!blob) throw new Error("Image compression failed");

  return {
    blob,
    previewUrl: canvas.toDataURL("image/jpeg", 0.72),
  };
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadCloudPhoto(blob: Blob): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append("file", blob, `checkin-${Date.now()}.jpg`);

  const response = await fetch("/api/checkin-photo", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as { url?: string; publicId?: string; error?: string };

  if (!response.ok || !result.url || !result.publicId) {
    throw new Error(result.error ?? "Private photo storage is unavailable.");
  }

  return { url: result.url, publicId: result.publicId };
}
