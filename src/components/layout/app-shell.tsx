"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, BarChart3, User, LogOut, Utensils, ChefHat, Scale } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/menu", label: "Menu", icon: Utensils },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/profile", label: "Profile", icon: User },
];

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background">
      {/* Sticky app bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <Link href="/dashboard" className="flex items-center">
          <Wordmark size="text-xl" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none">
            <Avatar className="size-9 border border-white/10 bg-[var(--lime)]/10">
              <AvatarFallback className="bg-transparent font-heading text-sm text-[var(--lime)]">
                {user ? initials(user.name) : "??"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-[var(--over)]">
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* Log FAB */}
      <Link
        href="/log"
        className="group fixed inset-x-0 bottom-20 z-40 mx-auto flex w-fit items-center"
        aria-label="Quick log"
      >
        <motion.span
          whileTap={{ scale: 0.9 }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--lime)] text-[var(--ink)] shadow-[0_8px_30px_rgba(199,249,75,0.35)] ring-1 ring-white/10"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </motion.span>
      </Link>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-white/5 bg-background/90 backdrop-blur-xl">
        <ul className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-[var(--lime)]" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}