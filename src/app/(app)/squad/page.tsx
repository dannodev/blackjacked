"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import type { SquadMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Flame, Trash2, Crown } from "lucide-react";

const SQUAD_COLORS = [
  "#dc0000",
  "#f5a524",
  "#4cc2ff",
  "#22c55e",
  "#a855f7",
  "#ec4899",
];

export default function SquadPage() {
  const squad = useStore((s) => s.squad);
  const createSquad = useStore((s) => s.createSquad);
  const addMember = useStore((s) => s.addSquadMember);
  const updateMember = useStore((s) => s.updateSquadMember);
  const removeMember = useStore((s) => s.removeSquadMember);
  const leaveSquad = useStore((s) => s.leaveSquad);

  const { user } = useAuth();
  const profile = useStore((s) => s.profile)!;

  const [newSquadName, setNewSquadName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberGoal, setMemberGoal] = useState("2000");

  if (!squad) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">Community</p>
          <h1 className="font-heading text-3xl font-extrabold">Squad</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Race your friends to the calorie goal.
          </p>
        </div>

        <Card className="premium-panel rounded-[1.8rem]">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--rosso)]/12 text-[var(--rosso-light)]">
              <Users className="size-8" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold">No crew yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Create a squad for you and up to 5 friends and track who is hitting their goals.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="squad-name">Squad name</Label>
              <Input
                id="squad-name"
                placeholder="e.g. Ferrari Fam"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (!newSquadName.trim()) {
                    toast.error("Name your squad");
                    return;
                  }
                  createSquad(newSquadName.trim());
                  addMember({
                    name: user?.name || "You",
                    color: SQUAD_COLORS[0],
                    calorie_goal: profile.calorie_goal,
                    kcal_in: 0,
                    kcal_out: 0,
                    streak: 0,
                  });
                  toast.success("Squad created");
                  setNewSquadName("");
                }}
                className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              >
                <Plus className="mr-1 size-4" />
                Create squad
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedMembers = [...squad.members].sort(
    (a, b) => b.kcal_in / Math.max(1, b.calorie_goal) - a.kcal_in / Math.max(1, a.calorie_goal),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">{squad.members.length} racer{squad.members.length === 1 ? "" : "s"}</p>
          <h1 className="font-heading text-3xl font-extrabold">{squad.name}</h1>
        </div>
        <button
          onClick={() => {
            leaveSquad();
            toast.success("Left squad");
          }}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-[var(--over)] hover:underline"
        >
          Leave
        </button>
      </div>

      {/* leaderboard */}
      <div className="space-y-2">
        <AnimatePresence>
          {sortedMembers.map((m, i) => (
            <MemberCard
              key={m.id}
              member={m}
              rank={i + 1}
              onUpdate={(patch) => updateMember(m.id, patch)}
              onRemove={() => {
                removeMember(m.id);
                toast.success(`${m.name} removed`);
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* add member */}
      {squad.members.length < 6 && (
        <Card className="premium-panel rounded-[1.6rem]">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Plus className="size-4 text-[var(--rosso-light)]" />
              Add a racer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Carlos"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Daily calorie goal</Label>
              <Input
                id="goal"
                type="number"
                value={memberGoal}
                onChange={(e) => setMemberGoal(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!memberName.trim()) {
                  toast.error("Enter a name");
                  return;
                }
                const goal = Number(memberGoal);
                if (!goal || goal < 800) {
                  toast.error("Enter a realistic goal");
                  return;
                }
                addMember({
                  name: memberName.trim(),
                  color: SQUAD_COLORS[squad.members.length % SQUAD_COLORS.length],
                  calorie_goal: goal,
                  kcal_in: 0,
                  kcal_out: 0,
                  streak: 0,
                });
                toast.success(`${memberName.trim()} joined the squad`);
                setMemberName("");
                setMemberGoal("2000");
              }}
              className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
            >
              Add friend
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberCard({
  member,
  rank,
  onUpdate,
  onRemove,
}: {
  member: SquadMember;
  rank: number;
  onUpdate: (patch: Partial<SquadMember>) => void;
  onRemove: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const pct = Math.min(100, (member.kcal_in / Math.max(1, member.calorie_goal)) * 100);
  const remaining = Math.max(0, member.calorie_goal - member.kcal_in);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="carbon-card rounded-[1.6rem] border-white/7">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-2xl font-heading text-lg font-bold text-white"
              style={{ background: member.color }}
            >
              {rank === 1 ? <Crown className="size-6" /> : member.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-heading text-base font-bold">{member.name}</p>
                <div className="flex items-center gap-1 text-[var(--rosso-light)]">
                  <Flame className="size-3.5" />
                  <span className="text-xs font-semibold">{member.streak}</span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: member.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" as const }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {Math.round(member.kcal_in)} / {member.calorie_goal} kcal
                </span>
                <span>{Math.round(remaining)} left</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setEditOpen(true)}
            >
              Update progress
            </Button>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger className="hidden" />
              <DialogContent className="rounded-[1.8rem] border-white/7 bg-[var(--smoke)]">
                <DialogHeader>
                  <DialogTitle className="font-heading">Update {member.name}</DialogTitle>
                </DialogHeader>
                <EditForm
                  member={member}
                  onSave={(patch) => {
                    onUpdate(patch);
                    setEditOpen(false);
                    toast.success(`${member.name} updated`);
                  }}
                />
              </DialogContent>
            </Dialog>
            <button
              onClick={onRemove}
              className="flex items-center justify-center rounded-lg border border-white/10 px-3 text-muted-foreground hover:text-[var(--over)]"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EditForm({
  member,
  onSave,
}: {
  member: SquadMember;
  onSave: (patch: Partial<SquadMember>) => void;
}) {
  const [kcalIn, setKcalIn] = useState(String(member.kcal_in));
  const [kcalOut, setKcalOut] = useState(String(member.kcal_out));
  const [goal, setGoal] = useState(String(member.calorie_goal));
  const [streak, setStreak] = useState(String(member.streak));

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="kcal-in">Calories in</Label>
          <Input
            id="kcal-in"
            type="number"
            value={kcalIn}
            onChange={(e) => setKcalIn(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kcal-out">Calories out</Label>
          <Input
            id="kcal-out"
            type="number"
            value={kcalOut}
            onChange={(e) => setKcalOut(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <Input
            id="goal"
            type="number"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="streak">Streak</Label>
          <Input
            id="streak"
            type="number"
            value={streak}
            onChange={(e) => setStreak(e.target.value)}
          />
        </div>
      </div>
      <Button
        onClick={() =>
          onSave({
            kcal_in: Number(kcalIn),
            kcal_out: Number(kcalOut),
            calorie_goal: Number(goal),
            streak: Number(streak),
          })
        }
        className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
      >
        Save
      </Button>
    </div>
  );
}
