import { ArrowRight, Camera, Clapperboard, Music } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MediaFeed } from "@/components/media/media-feed";
import { WhoToFollow } from "@/components/social/who-to-follow";

export const metadata: Metadata = { title: "Explore" };

const SECTIONS = [
  { kind: "photo", title: "Photography", icon: Camera, tab: "photos", tint: "from-sky-500/20" },
  { kind: "audio", title: "Music & audio", icon: Music, tab: "audio", tint: "from-fuchsia-500/20" },
  { kind: "video", title: "Video", icon: Clapperboard, tab: "videos", tint: "from-amber-500/20" },
] as const;

export default function ExplorePage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-heading text-4xl tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover creators and browse by medium.</p>
      </header>

      <nav aria-label="Browse by medium" className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map(({ title, icon: Icon, tab, tint }) => (
          <Link
            key={tab}
            href={`/feed?tab=${tab}`}
            className={`surface glow-hover group flex items-center gap-3 bg-gradient-to-br ${tint} to-transparent p-4`}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-background/60">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="font-medium">{title}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </nav>

      <div className="xl:hidden">
        <WhoToFollow limit={6} title="Creators to follow" />
      </div>

      {SECTIONS.map(({ kind, title, tab }) => (
        <section key={kind} aria-labelledby={`sec-${kind}`} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id={`sec-${kind}`} className="text-xl font-semibold">
              Latest in {title.toLowerCase()}
            </h2>
            <Link href={`/feed?tab=${tab}`} className="text-sm text-primary hover:underline">
              See all
            </Link>
          </div>
          <MediaFeed params={{ kind, limit: 4 }} paginate={false} emptyDescription="No posts yet. Upload the first one!" />
        </section>
      ))}
    </div>
  );
}
