"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  authErrorMessage,
  passwordRules,
  passwordSchema,
} from "@/lib/auth-validation";
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
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Use a valid email address."),
  password: passwordSchema,
});

const verificationSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

type Values = z.infer<typeof schema>;
type VerificationValues = z.infer<typeof verificationSchema>;

export default function SignupPage() {
  const { signUp, verifyEmailCode } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const {
    register: registerVerification,
    handleSubmit: handleVerificationSubmit,
    formState: {
      errors: verificationErrors,
      isSubmitting: isVerifying,
    },
  } = useForm<VerificationValues>({
    resolver: zodResolver(verificationSchema),
  });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      const { needsEmailConfirmation } = await signUp(
        values.name,
        values.email,
        values.password,
      );
      if (needsEmailConfirmation) {
        setPendingEmail(values.email);
        toast.success("Verification code sent");
        return;
      }
      toast.success("Account created");
      router.replace("/onboarding");
    } catch (err) {
      const message = authErrorMessage(err, "Sign up failed.");
      setFormError(message);
      toast.error(message);
    }
  };

  const onVerify = async (values: VerificationValues) => {
    if (!pendingEmail) return;
    setFormError(null);

    try {
      await verifyEmailCode(pendingEmail, values.code.trim());
      toast.success("Email verified");
      router.replace("/onboarding");
    } catch (err) {
      const message = authErrorMessage(err, "Verification failed.");
      setFormError(message);
      toast.error(message);
    }
  };

  return (
    <Card className="premium-panel rounded-[1.7rem]">
      <CardHeader>
        <CardTitle className="font-heading">
          {pendingEmail ? "Verify email" : "Create account"}
        </CardTitle>
        <CardDescription>
          {pendingEmail
            ? `Enter the verification code sent to ${pendingEmail}.`
            : "Use a real email and a strong password."}
        </CardDescription>
      </CardHeader>
      {pendingEmail ? (
        <form noValidate onSubmit={handleVerificationSubmit(onVerify)}>
          <CardContent className="space-y-4">
            {formError && (
              <div className="rounded-2xl border border-[var(--over)]/35 bg-[var(--over)]/10 px-3.5 py-3 text-sm text-[var(--over)]">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                {...registerVerification("code")}
              />
              {verificationErrors.code && (
                <p className="text-sm text-[var(--over)]">
                  {verificationErrors.code.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-2 flex-col gap-3">
            <motion.div whileTap={{ scale: 0.97 }} className="w-full">
              <Button
                type="submit"
                className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying…" : "Verify and continue"}
              </Button>
            </motion.div>
            <button
              type="button"
              className="text-sm font-medium text-[var(--rosso-light)] underline-offset-4 hover:underline"
              onClick={() => {
                setPendingEmail(null);
                setFormError(null);
              }}
            >
              Use a different email
            </button>
          </CardFooter>
        </form>
      ) : (
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {formError && (
            <div className="rounded-2xl border border-[var(--over)]/35 bg-[var(--over)]/10 px-3.5 py-3 text-sm text-[var(--over)]">
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" placeholder="Dani" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-[var(--over)]">{errors.name.message}</p>
            )}
          </div>
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
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">{passwordRules}</p>
            {errors.password && (
              <p className="text-sm text-[var(--over)]">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <motion.div whileTap={{ scale: 0.97 }} className="w-full">
            <Button
              type="submit"
              className="w-full bg-[var(--rosso)] font-semibold text-white hover:bg-[var(--rosso)]/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Lighting the spark…" : "Get started"}
            </Button>
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Already in?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--rosso-light)] underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
      )}
    </Card>
  );
}
