"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  return (
    <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="font-heading">Log in</CardTitle>
        <CardDescription>
          Welcome back. Any email works in demo mode.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@burn.app"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-[var(--over)]">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-[var(--over)]">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="w-full"
          >
            <Button
              type="submit"
              className="w-full bg-[var(--rosso)] text-white font-semibold hover:bg-[var(--rosso)]/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Burning in…" : "Log in"}
            </Button>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--rosso)] underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}