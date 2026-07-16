"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Streaks } from "@/lib/types";

const SQUAD_COLORS = [
  "#dc0000",
  "#f5a524",
  "#4cc2ff",
  "#22c55e",
  "#a855f7",
  "#ec4899",
] as const;
const E2E_AUTH_KEY = "blackjacked.e2eAuth";
const E2E_SQUAD_KEY = "blackjacked.e2eSquad";
const E2E_USER_ID = "00000000-0000-4000-8000-000000000001";

export type SquadRow = {
  id: string;
  owner_id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type SquadMemberRow = {
  squad_id: string;
  user_id: string;
  display_name: string;
  color: string;
  role: "owner" | "member";
  joined_at: string;
};

export type SquadActivityRow = {
  squad_id: string;
  user_id: string;
  date: string;
  kcal_in: number;
  kcal_out_activity: number;
  workouts_count: number;
  meals_count: number;
  streak: number;
  updated_at: string;
};

export type SquadMessageRow = {
  id: string;
  squad_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type SquadSnapshot = {
  squad: SquadRow;
  members: SquadMemberRow[];
  activity: SquadActivityRow[];
  messages: SquadMessageRow[];
};

export type PublicActivityInput = {
  date: string;
  kcalIn: number;
  kcalOutActivity: number;
  workoutsCount: number;
  mealsCount: number;
  streaks: Streaks;
};

function e2eSnapshot(): SquadSnapshot {
  return {
    squad: {
      id: "00000000-0000-4000-8000-0000000000aa",
      owner_id: "00000000-0000-4000-8000-0000000000bb",
      name: "Test Squad",
      invite_code: "BLACK1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    members: [
      {
        squad_id: "00000000-0000-4000-8000-0000000000aa",
        user_id: E2E_USER_ID,
        display_name: "E2E Racer",
        color: SQUAD_COLORS[0],
        role: "member",
        joined_at: new Date().toISOString(),
      },
    ],
    activity: [],
    messages: [],
  };
}

function canUseE2EAuthBypass() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return (
    typeof window !== "undefined" &&
    isLocalhost &&
    (localStorage.getItem(E2E_AUTH_KEY) === "1" ||
      search.includes("__e2eAuth=1"))
  );
}

function getE2eSquad(): SquadSnapshot | null {
  if (!canUseE2EAuthBypass() || typeof window === "undefined") return null;
  const raw = localStorage.getItem(E2E_SQUAD_KEY);
  return raw ? (JSON.parse(raw) as SquadSnapshot) : null;
}

function setE2eSquad(snapshot: SquadSnapshot | null) {
  if (!canUseE2EAuthBypass() || typeof window === "undefined") return;
  if (snapshot) localStorage.setItem(E2E_SQUAD_KEY, JSON.stringify(snapshot));
  else localStorage.removeItem(E2E_SQUAD_KEY);
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for real squads.");
  }

  return getSupabaseBrowser();
}

async function getCurrentUserId() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error("Sign in to use squads.");

  return data.user.id;
}

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function loadSquadById(squadId: string): Promise<SquadSnapshot> {
  const supabase = requireSupabase();

  const [squadResult, membersResult, activityResult, messagesResult] =
    await Promise.all([
      supabase.from("squads").select("*").eq("id", squadId).single(),
      supabase
        .from("squad_members")
        .select("*")
        .eq("squad_id", squadId)
        .order("joined_at", { ascending: true }),
      supabase.from("squad_activity").select("*").eq("squad_id", squadId),
      supabase
        .from("squad_messages")
        .select("*")
        .eq("squad_id", squadId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (squadResult.error) throw squadResult.error;
  if (membersResult.error) throw membersResult.error;
  if (activityResult.error) throw activityResult.error;
  if (messagesResult.error) throw messagesResult.error;

  return {
    squad: squadResult.data as SquadRow,
    members: (membersResult.data ?? []) as SquadMemberRow[],
    activity: (activityResult.data ?? []) as SquadActivityRow[],
    messages: [...((messagesResult.data ?? []) as SquadMessageRow[])].reverse(),
  };
}

export async function loadMySquad(): Promise<SquadSnapshot | null> {
  if (canUseE2EAuthBypass()) return getE2eSquad();

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("squad_members")
    .select("squad_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.squad_id) return null;

  return loadSquadById(data.squad_id);
}

export async function createRemoteSquad(name: string, displayName: string) {
  if (canUseE2EAuthBypass()) {
    const snapshot = e2eSnapshot();
    snapshot.squad.name = name;
    snapshot.squad.owner_id = E2E_USER_ID;
    snapshot.members[0].display_name = displayName;
    snapshot.members[0].role = "owner";
    setE2eSquad(snapshot);
    return snapshot;
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const squadId = crypto.randomUUID();
  const inviteCode = generateInviteCode();

  const { error: squadError } = await supabase.from("squads").insert({
    id: squadId,
    owner_id: userId,
    name,
    invite_code: inviteCode,
  });
  if (squadError) throw squadError;

  const { error: memberError } = await supabase.from("squad_members").insert({
    squad_id: squadId,
    user_id: userId,
    display_name: displayName,
    color: SQUAD_COLORS[0],
    role: "owner",
  });
  if (memberError) throw memberError;

  return loadSquadById(squadId);
}

export async function joinRemoteSquad(inviteCode: string, displayName: string) {
  if (canUseE2EAuthBypass()) {
    if (inviteCode.trim().toUpperCase() !== "BLACK1") {
      throw new Error("Invalid squad code");
    }
    const snapshot = e2eSnapshot();
    snapshot.members[0].display_name = displayName;
    setE2eSquad(snapshot);
    return snapshot;
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const cleanCode = inviteCode.trim().toUpperCase();
  const { data: squad, error: squadError } = await supabase
    .from("squads")
    .select("id")
    .eq("invite_code", cleanCode)
    .maybeSingle();

  if (squadError) throw squadError;
  if (!squad?.id) throw new Error("Invalid squad code");

  const colorIndex = crypto.getRandomValues(new Uint8Array(1))[0] % SQUAD_COLORS.length;
  const { error: memberError } = await supabase.from("squad_members").insert({
    squad_id: squad.id,
    user_id: userId,
    display_name: displayName.trim() || "Racer",
    color: SQUAD_COLORS[colorIndex],
    role: "member",
  });

  if (memberError) throw memberError;
  return loadSquadById(squad.id);
}

export async function leaveRemoteSquad(squadId: string) {
  if (canUseE2EAuthBypass()) {
    void squadId;
    setE2eSquad(null);
    return;
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("squad_members")
    .delete()
    .eq("squad_id", squadId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function syncMySquadActivity(
  squadId: string,
  activity: PublicActivityInput,
) {
  if (canUseE2EAuthBypass()) {
    const snapshot = getE2eSquad();
    if (!snapshot) return;
    snapshot.activity = [
      {
        squad_id: squadId,
        user_id: E2E_USER_ID,
        date: activity.date,
        kcal_in: Math.round(activity.kcalIn),
        kcal_out_activity: Math.round(activity.kcalOutActivity),
        workouts_count: activity.workoutsCount,
        meals_count: activity.mealsCount,
        streak: activity.streaks.current_streak,
        updated_at: new Date().toISOString(),
      },
    ];
    setE2eSquad(snapshot);
    return;
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("squad_activity").upsert(
    {
      squad_id: squadId,
      user_id: userId,
      date: activity.date,
      kcal_in: Math.round(activity.kcalIn),
      kcal_out_activity: Math.round(activity.kcalOutActivity),
      workouts_count: activity.workoutsCount,
      meals_count: activity.mealsCount,
      streak: activity.streaks.current_streak,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "squad_id,user_id,date" },
  );

  if (error) throw error;
}

export async function sendSquadMessage(squadId: string, body: string) {
  if (canUseE2EAuthBypass()) {
    const snapshot = getE2eSquad();
    if (!snapshot) return;
    snapshot.messages.push({
      id: crypto.randomUUID(),
      squad_id: squadId,
      user_id: E2E_USER_ID,
      body,
      created_at: new Date().toISOString(),
    });
    setE2eSquad(snapshot);
    return;
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("squad_messages").insert({
    squad_id: squadId,
    user_id: userId,
    body,
  });

  if (error) throw error;
}

export function subscribeToSquad(
  squadId: string,
  onChange: () => void,
) {
  if (canUseE2EAuthBypass()) {
    void squadId;
    void onChange;
    return () => undefined;
  }

  const supabase = requireSupabase();
  const channel = supabase
    .channel(`squad:${squadId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "squads", filter: `id=eq.${squadId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "squad_members",
        filter: `squad_id=eq.${squadId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "squad_activity",
        filter: `squad_id=eq.${squadId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "squad_messages",
        filter: `squad_id=eq.${squadId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
