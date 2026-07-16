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
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = "blackjacked.mock-user";
const USERS_KEY = "blackjacked.mock-users";

const AuthContext = createContext<AuthContextValue | null>(null);

type StoredUser = AppUser & { passwordHash: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fakeHash = (s: string) => btoa(unescape(encodeURIComponent(s)));

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Extract AppUser from either Supabase user or mock user */
function supabaseToAppUser(u: SupabaseUser): AppUser {
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

  // ── Init ──────────────────────────────────────────────
  useEffect(() => {
    if (useSupabase) {
      // Supabase mode: check current session
      const supabase = getSupabaseBrowser();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setUser(supabaseToAppUser(data.user));
        else setUser(null);
        setLoading(false);
      });
      // Listen for auth changes
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) setUser(supabaseToAppUser(session.user));
          else setUser(null);
          setLoading(false);
        },
      );
      return () => listener.subscription.unsubscribe();
    } else {
      // Mock mode: read from localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
  }, [useSupabase]);

  const persistMock = useCallback((u: AppUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

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
        await wait(450);
        const users = readUsers();
        const found = users.find(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.passwordHash === fakeHash(password),
        );
        if (!found) {
          // Demo login: accept any email/password, auto-create
          const existing = users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase(),
          );
          if (existing) {
            persistMock({
              id: existing.id,
              email: existing.email,
              name: existing.name,
              createdAt: existing.createdAt,
            });
            return;
          }
          const newUser: StoredUser = {
            id: crypto.randomUUID(),
            email,
            name: email.split("@")[0],
            createdAt: new Date().toISOString(),
            passwordHash: fakeHash(password),
          };
          writeUsers([...users, newUser]);
          persistMock({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            createdAt: newUser.createdAt,
          });
        } else {
          persistMock({
            id: found.id,
            email: found.email,
            name: found.name,
            createdAt: found.createdAt,
          });
        }
      }
    },
    [useSupabase, persistMock],
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
        // onAuthStateChange will update the user (if email confirmation is off)
      } else {
        await wait(550);
        const users = readUsers();
        const newUser: StoredUser = {
          id: crypto.randomUUID(),
          email,
          name,
          createdAt: new Date().toISOString(),
          passwordHash: fakeHash(password),
        };
        writeUsers([...users, newUser]);
        persistMock({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: newUser.createdAt,
        });
      }
    },
    [useSupabase, persistMock],
  );

  // ── Sign out ─────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (useSupabase) {
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
    } else {
      persistMock(null);
    }
  }, [useSupabase, persistMock]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}