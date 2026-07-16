import { cn } from "@/lib/utils";

export function Bolt({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Wordmark({
  className,
  size = "text-2xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight inline-flex items-center leading-none text-foreground",
        size,
        className,
      )}
    >
      Blac
      <Bolt className="mx-[0.04em] -my-[0.05em] h-[0.85em] w-[0.85em] text-[var(--lime)]" strokeWidth={2.5} />
      Jacked
    </span>
  );
}