"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useMe } from "@/hooks/use-auth";
import { useSuggestions } from "@/hooks/use-social";
import { FollowButton } from "./follow-button";

export function WhoToFollow({ limit = 5, title = "Who to follow" }: { limit?: number; title?: string }) {
  const { user, isLoading: meLoading } = useMe();
  const { data, isPending, isError } = useSuggestions(limit, !meLoading);

  if (isError) return null;

  return (
    <section aria-labelledby="wtf-title" className="surface p-4">
      <h2 id="wtf-title" className="mb-3 text-sm font-semibold">
        {title}
      </h2>
      {isPending ? (
        <ul className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">You&apos;re following everyone. Nice!</p>
      ) : (
        <ul className="space-y-3">
          {data.map((u) => (
            <li key={u.id} className="flex items-center gap-3">
              <Link href={`/u/${u.handle}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
                <UserAvatar user={u} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{u.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{u.handle}</span>
                </span>
              </Link>
              {user ? <FollowButton handle={u.handle} size="sm" /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
