"use client";

import { CalendarDays, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { MediaFeed } from "@/components/media/media-feed";
import { FollowButton } from "@/components/social/follow-button";
import { FollowListDialog } from "@/components/social/follow-list-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { useMe } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-social";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { MediaKind } from "@/lib/api/types";
import { formatCount, formatDate } from "@/lib/format";

const KIND_TABS: { value: "all" | MediaKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Videos" },
];

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="flex items-end gap-4 px-4">
        <Skeleton className="-mt-16 size-28 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProfileView({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = use(params);
  const handle = decodeURIComponent(rawHandle);
  const { data: profile, isPending, isError, error, refetch } = useProfile(handle);
  const { user } = useMe();
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [list, setList] = useState<"followers" | "following" | null>(null);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={UserX}
        title="Creator not found"
        description={`There's no one called @${handle} here.`}
        action={{ href: "/explore", label: "Explore creators" }}
      />
    );
  }
  if (isPending) return <ProfileSkeleton />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const stats = [
    { label: "Posts", value: profile.mediaCount },
    { label: "Followers", value: profile.followerCount, onClick: () => setList("followers") },
    { label: "Following", value: profile.followingCount, onClick: () => setList("following") },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="profile-name" className="surface overflow-hidden">
        <div className="relative h-36 bg-brand sm:h-44" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(0,0,0,0.25),transparent_50%)]" />
        </div>
        <div className="px-5 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <UserAvatar user={profile} className="-mt-14 size-28 border-4 border-card text-2xl" />
            <div className="flex gap-2">
              {profile.isMe ? (
                <Button asChild variant="outline">
                  <Link href="/settings">
                    <Pencil /> Edit profile
                  </Link>
                </Button>
              ) : user ? (
                <FollowButton handle={profile.handle} isFollowing={profile.isFollowing} />
              ) : (
                <Button asChild>
                  <Link href={`/signin?next=/u/${profile.handle}`}>Follow</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <h1 id="profile-name" className="font-heading text-3xl tracking-tight">
              {profile.name}
            </h1>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          </div>
          {profile.bio ? <p className="mt-3 max-w-2xl whitespace-pre-wrap leading-relaxed">{profile.bio}</p> : null}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden /> Joined {formatDate(profile.createdAt)}
          </p>
          <dl className="mt-4 flex gap-6">
            {stats.map((s) => (
              <div key={s.label}>
                {s.onClick ? (
                  <button type="button" onClick={s.onClick} className="rounded-md text-left hover:underline">
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <span className="font-semibold tabular-nums">{formatCount(s.value)}</span>{" "}
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </dd>
                  </button>
                ) : (
                  <>
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <span className="font-semibold tabular-nums">{formatCount(s.value)}</span>{" "}
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </dd>
                  </>
                )}
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
        <TabsList className="h-10">
          {KIND_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3.5">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <MediaFeed
        key={kind}
        params={{ author: profile.handle, kind: kind === "all" ? undefined : kind }}
        emptyTitle={profile.isMe ? "Share your first piece" : "No posts yet"}
        emptyDescription={profile.isMe ? "Upload a photo, track or video to get started." : `${profile.name} hasn't posted anything here yet.`}
        emptyAction={profile.isMe ? { href: "/upload", label: "Upload" } : undefined}
      />

      <FollowListDialog handle={profile.handle} which="followers" open={list === "followers"} onOpenChange={(o) => setList(o ? "followers" : null)} />
      <FollowListDialog handle={profile.handle} which="following" open={list === "following"} onOpenChange={(o) => setList(o ? "following" : null)} />
    </div>
  );
}
