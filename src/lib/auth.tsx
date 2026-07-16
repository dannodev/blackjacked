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
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (useSupabase) {
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
          options: { data: { name } },
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
    if (useSupabase) {
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
