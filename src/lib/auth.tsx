"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isSupabaseConfigured, getSupabaseBrowser } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type AuthState = {
  user: AppUser | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const LAST_USER_KEY = "blackjacked.lastUserId";
const E2E_AUTH_KEY = "blackjacked.e2eAuth";
const E2E_NO_AUTH_KEY = "blackjacked.e2eNoAuth";
const E2E_USER: AppUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "e2e@blackjacked.test",
  name: "E2E Racer",
  createdAt: "2026-07-16T00:00:00.000Z",
};
const E2E_PROFILE = {
  sex: "male" as const,
  birthdate: "1995-01-15",
  height_cm: 180,
  current_weight_kg: 80,
  activity_factor: 1.55 as const,
  calorie_goal: 1900,
  protein_goal: 130,
  fat_goal: 60,
  carb_goal: 200,
  createdAt: "2026-07-16T00:00:00.000Z",
  meal_schedule: {
    breakfast_time: "08:00",
    am_snack_time: "11:00",
    lunch_time: "13:30",
    pm_snack_time: "17:00",
    dinner_time: "20:00",
  },
};

function authRedirectTo(path: string) {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${path}`;
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

function shouldDisableE2EAuth() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return (
    typeof window !== "undefined" &&
    isLocalhost &&
    (localStorage.getItem(E2E_NO_AUTH_KEY) === "1" ||
      search.includes("__e2eNoAuth=1"))
  );
}

/** Extract AppUser from Supabase user metadata. */
export function supabaseToAppUser(u: SupabaseUser): AppUser {
  const meta = u.user_metadata as Record<string, string> | null;
  return {
    id: u.id,
    email: u.email ?? "",
    name: meta?.name ?? u.email?.split("@")[0] ?? "Racer",
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const useSupabase = isSupabaseConfigured();
  const initialE2EUser =
    canUseE2EAuthBypass() && !shouldDisableE2EAuth() ? E2E_USER : null;
  const initialE2ENoAuth = canUseE2EAuthBypass() && shouldDisableE2EAuth();
  const [user, setUser] = useState<AppUser | null>(initialE2EUser);
  const [loading, setLoading] = useState(!initialE2EUser && !initialE2ENoAuth);

  const applySupabaseUser = useCallback((nextUser: SupabaseUser | null) => {
    if (!nextUser) {
      setUser(null);
      return;
    }

    const previousUserId = localStorage.getItem(LAST_USER_KEY);
    if (previousUserId && previousUserId !== nextUser.id) {
      useStore.getState().resetAll();
    }

    localStorage.setItem(LAST_USER_KEY, nextUser.id);
    setUser(supabaseToAppUser(nextUser));
  }, []);

  // ── Init ──────────────────────────────────────────────
  useEffect(() => {
    if (canUseE2EAuthBypass()) {
      if (shouldDisableE2EAuth()) {
        setUser(null);
        setLoading(false);
        return;
      }

      localStorage.setItem(E2E_AUTH_KEY, "1");
      localStorage.setItem(LAST_USER_KEY, E2E_USER.id);
      if (!useStore.getState().profile) {
        useStore.getState().setProfile(E2E_PROFILE);
      }
      setUser(E2E_USER);
      setLoading(false);
      return;
    }

    if (useSupabase) {
      // Supabase mode: check current session
      const supabase = getSupabaseBrowser();
      supabase.auth.getUser().then(({ data }) => {
        applySupabaseUser(data.user);
        setLoading(false);
      });
      // Listen for auth changes
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          applySupabaseUser(session?.user ?? null);
          setLoading(false);
        },
      );
      return () => listener.subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, [applySupabaseUser, useSupabase]);

  // ── Sign in ───────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      if (canUseE2EAuthBypass()) {
        localStorage.setItem(LAST_USER_KEY, E2E_USER.id);
        setUser(E2E_USER);
      } else if (useSupabase) {
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // onAuthStateChange will update the user
      } else {
        throw new Error("Authentication is not configured for this build.");
      }
    },
    [useSupabase],
  );

  // ── Sign up ──────────────────────────────────────────
  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (useSupabase) {
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: authRedirectTo("/onboarding"),
          },
        });
        if (error) throw error;
        const { data: userData } = await supabase.auth.getUser();
        return { needsEmailConfirmation: !userData.user };
      } else {
        throw new Error("Authentication is not configured for this build.");
      }
    },
    [useSupabase],
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string) => {
      if (!useSupabase) {
        throw new Error("Authentication is not configured for this build.");
      }

      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (error) throw error;
    },
    [useSupabase],
  );

  // ── Sign out ─────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (canUseE2EAuthBypass()) {
      setUser(null);
    } else if (useSupabase) {
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
    } else {
      setUser(null);
    }
    localStorage.removeItem(LAST_USER_KEY);
    useStore.getState().resetAll();
  }, [useSupabase]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, verifyEmailCode, signOut }),
    [user, loading, signIn, signUp, verifyEmailCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
