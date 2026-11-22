import { ArrowRight, Camera, Clapperboard, Heart, Music, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { HeroCollage } from "@/components/landing/hero-collage";
import { LandingNavActions } from "@/components/landing/landing-nav-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Camera, title: "Photography", body: "Masonry galleries that let your frames breathe, with double-tap to like." },
  { icon: Music, title: "Music & audio", body: "A beautiful player for your tracks, demos and podcasts." },
  { icon: Clapperboard, title: "Video", body: "Share reels, films and performances in crisp 16:9." },
  { icon: Users, title: "Real community", body: "Follow creators you love and build a feed that's actually yours." },
  { icon: Heart, title: "Meaningful feedback", body: "Likes and threaded comments from people who care about the craft." },
  { icon: ShieldCheck, title: "Safe by design", body: "Moderation tools, private-by-default sessions and secure uploads." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--brand-from)_22%,transparent),transparent)]"
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LandingNavActions />
        </div>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> A home for photographers, musicians & filmmakers
            </p>
            <h1 className="font-heading text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Your craft, <em className="text-brand not-italic sm:italic">seen</em> by people who care.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              TalentHub is where creators share photos, music and video, collect real feedback, and grow an audience
              that follows the work, not the algorithm.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 bg-brand px-5 text-base text-white shadow-lg shadow-fuchsia-500/25 hover:opacity-90">
                <Link href="/signup">
                  Start sharing free <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-base">
                <Link href="/feed">Explore the feed</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No credit card. No ads. Just your work.</p>
          </div>
          <HeroCollage />
        </section>

        <section aria-labelledby="features" className="border-t bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="features" className="font-heading max-w-2xl text-4xl tracking-tight sm:text-5xl">
              Everything you need to show your best work.
            </h2>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="surface glow-hover p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-zinc-950 px-8 py-14 text-center text-white sm:px-16">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_80%_at_20%_0%,color-mix(in_oklch,var(--brand-from)_50%,transparent),transparent),radial-gradient(50%_80%_at_80%_100%,color-mix(in_oklch,var(--brand-to)_45%,transparent),transparent)]" />
            <div className="relative space-y-5">
              <h2 className="font-heading text-4xl tracking-tight sm:text-5xl">Ready to be discovered?</h2>
              <p className="mx-auto max-w-lg text-white/70">Create your profile in under a minute and post your first piece today.</p>
              <Button asChild size="lg" className="h-11 bg-white px-6 text-base text-zinc-950 hover:bg-white/90">
                <Link href="/signup">Create your free account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Brand />
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/feed" className="hover:text-foreground">
              Feed
            </Link>
            <Link href="/explore" className="hover:text-foreground">
              Explore
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Join
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
