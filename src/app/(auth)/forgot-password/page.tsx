"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      await requestPasswordReset(email.trim().toLowerCase());
      setSent(true);
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="premium-panel rounded-[1.7rem]">
      <CardHeader>
        <CardTitle className="font-heading">Reset your password</CardTitle>
        <CardDescription>We’ll email you a secure link to choose a new password.</CardDescription>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-3">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {sent && <p className="text-sm text-emerald-300" role="status">Check your inbox and spam folder.</p>}
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button className="w-full bg-[var(--rosso)] text-white" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-white">Back to login</Link>
        </CardFooter>
      </form>
    </Card>
  );
}
