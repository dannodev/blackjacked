import Image from "next/image";
import { cn } from "@/lib/utils";

export function BlackjackMark({ className }: { className?: string }) {
  return (
    <Image
      src="/blackjacked-logo.png"
      alt=""
      width={96}
      height={96}
      className={cn("inline-block object-contain", className)}
      aria-hidden
      priority
    />
  );
}

export function Wordmark({
  className,
  size = "text-xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight inline-flex items-center leading-none text-foreground",
        size,
        className,
      )}
    >
      Blac
      <BlackjackMark className="mx-[0.08em] -my-[0.18em] h-[1.22em] w-[1.22em]" />
      Jacked
    </span>
  );
}
