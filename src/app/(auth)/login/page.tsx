"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { authErrorMessage, passwordSchema } from "@/lib/auth-validation";
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
  email: z.string().email("Use a valid email address."),
  password: passwordSchema,
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (err) {
      const message = authErrorMessage(err, "Authentication failed.");
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <Card className="premium-panel rounded-[1.7rem]">
      <CardHeader>
        <CardTitle className="font-heading">Log in</CardTitle>
        <CardDescription>
          Wilis chaparro me la pelas.
        </CardDescription>
      </CardHeader>
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {formError && (
            <div className="rounded-2xl border border-[var(--over)]/35 bg-[var(--over)]/10 px-3.5 py-3 text-sm text-[var(--over)]">
              {formError}
            </div>
          )}
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-12"
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 flex w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-[var(--over)]">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <div className="w-full transition-transform active:scale-[0.97]">
            <Button
              type="submit"
              className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Burning in…" : "Log in"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--rosso-light)] underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
