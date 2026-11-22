import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid size-8 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-fuchsia-500/20", className)}
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d="M5 7h14M12 7v12" />
        <circle cx="18" cy="17" r="2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight", className)}>
      <Logo />
      <span className="text-lg">TalentHub</span>
    </Link>
  );
}
