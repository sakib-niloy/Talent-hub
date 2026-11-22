"use client";

import { Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MediaFeed } from "@/components/media/media-feed";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/use-auth";
import type { MediaListParams } from "@/lib/api/endpoints";

const TABS = [
  { value: "all", label: "All", params: {} },
  { value: "following", label: "Following", params: { feed: "following" } },
  { value: "photos", label: "Photos", params: { kind: "photo" } },
  { value: "audio", label: "Audio", params: { kind: "audio" } },
  { value: "videos", label: "Videos", params: { kind: "video" } },
] as const satisfies readonly { value: string; label: string; params: MediaListParams }[];

type TabValue = (typeof TABS)[number]["value"];

export function FeedView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useMe();

  const raw = searchParams.get("tab");
  const tab: TabValue = TABS.some((t) => t.value === raw) ? (raw as TabValue) : "all";
  const active = TABS.find((t) => t.value === tab)!;

  const setTab = (value: string) => {
    const qs = value === "all" ? "" : `?tab=${value}`;
    router.replace(`${pathname}${qs}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl tracking-tight">Your feed</h1>
          <p className="text-sm text-muted-foreground">Fresh work from the TalentHub community.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-10">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-3.5">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {tab === "following" && !isLoading && !user ? (
        <EmptyState
          icon={Users}
          title="See posts from people you follow"
          description="Sign in to build your personal feed."
          action={{ href: "/signin?next=/feed?tab=following", label: "Sign in" }}
        />
      ) : (
        <MediaFeed
          key={tab}
          params={active.params}
          enabled={tab !== "following" || !!user}
          emptyTitle={tab === "following" ? "Your following feed is empty" : "Nothing here yet"}
          emptyDescription={
            tab === "following" ? "Follow some creators to see their work here." : "Be the first to share something."
          }
          emptyAction={tab === "following" ? { href: "/explore", label: "Find creators" } : { href: "/upload", label: "Upload" }}
        />
      )}
    </div>
  );
}
