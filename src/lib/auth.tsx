"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MockUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type AuthState = {
  user: MockUser | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = "blackjacked.mock-user";
const USERS_KEY = "blackjacked.mock-users";

const AuthContext = createContext<AuthContextValue | null>(null);

type StoredUser = MockUser & { passwordHash: string };

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const persist = useCallback((u: MockUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await wait(450);
      const users = readUsers();
      const found = users.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.passwordHash === fakeHash(password),
      );
      if (!found) {
        // demo login: accept any email/password, auto-create account
        const existing = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );
        if (existing) {
          const cleaned: MockUser = {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            createdAt: existing.createdAt,
          };
          persist(cleaned);
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
        persist({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: newUser.createdAt,
        });
      } else {
        persist({
          id: found.id,
          email: found.email,
          name: found.name,
          createdAt: found.createdAt,
        });
      }
    },
    [persist],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
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
      persist({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
      });
    },
    [persist],
  );

  const signOut = useCallback(() => persist(null), [persist]);

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