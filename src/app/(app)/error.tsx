"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-2xl font-bold text-[var(--rosso)]">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again or refresh the page.
      </p>
      <Button
        onClick={reset}
        className="bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
      >
        Try again
      </Button>
    </div>
  );
}
