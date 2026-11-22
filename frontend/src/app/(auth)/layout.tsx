import { Camera, Clapperboard, Music } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-zinc-950 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_30%,color-mix(in_oklch,var(--brand-from)_55%,transparent),transparent),radial-gradient(50%_50%_at_75%_70%,color-mix(in_oklch,var(--brand-to)_45%,transparent),transparent)]" />
        <div className="relative flex h-full flex-col justify-end gap-8 p-12 text-white">
          <div className="grid grid-cols-3 gap-3">
            {[Camera, Music, Clapperboard].map((Icon, i) => (
              <div
                key={i}
                className="grid aspect-square place-items-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur"
                style={{ transform: `translateY(${[12, -12, 4][i]}px)` }}
              >
                <Icon className="size-10 opacity-90" />
              </div>
            ))}
          </div>
          <blockquote className="max-w-md">
            <p className="font-heading text-4xl leading-tight">
              “Your craft deserves an audience that <em>actually</em> looks.”
            </p>
            <footer className="mt-4 text-sm text-white/60">TalentHub: photos, music & video from real creators.</footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
