"use client";

import { ImageOff, Loader2 } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnInView } from "@/hooks/use-in-view";
import { useMediaFeed } from "@/hooks/use-media";
import { errorMessage } from "@/lib/api/client";
import type { MediaListParams } from "@/lib/api/endpoints";
import type { MediaKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { MediaCard } from "./media-card";

/** Layout per kind: photo masonry, audio list, 16:9 video grid, mixed masonry for "all". */
function layoutClass(kind?: MediaKind) {
  switch (kind) {
    case "photo":
      return "columns-1 gap-4 sm:columns-2 2xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid";
    case "audio":
      return "mx-auto flex max-w-2xl flex-col gap-4";
    case "video":
      return "grid gap-4 md:grid-cols-2";
    default:
      return "columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid";
  }
}

export function FeedSkeleton({ kind, count = 4 }: { kind?: MediaKind; count?: number }) {
  return (
    <div className={layoutClass(kind)} aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface overflow-hidden">
          <div className="flex items-center gap-2.5 p-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className={cn("w-full rounded-none", kind === "audio" ? "h-24" : i % 2 ? "h-72" : "h-52")} />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaFeed({
  params,
  enabled = true,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Be the first to share something.",
  emptyAction = { href: "/upload", label: "Upload" },
  paginate = true,
}: {
  params: MediaListParams;
  enabled?: boolean;
  paginate?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { href: string; label: string } | undefined;
}) {
  const query = useMediaFeed(params, { enabled });
  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  const sentinel = useOnInView<HTMLDivElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
    paginate && !!hasNextPage,
  );

  if (isPending) return <FeedSkeleton kind={params.kind} />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  const items = data.pages.flatMap((p) => p.data);
  if (items.length === 0) {
    return <EmptyState icon={ImageOff} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div>
      <div className={layoutClass(params.kind)}>
        {items.map((m) => (
          <MediaCard key={m.id} media={m} />
        ))}
      </div>
      {!paginate ? null : <div ref={sentinel} className="flex justify-center py-6">
        {isFetchingNextPage ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading more" />
        ) : hasNextPage ? (
          <Button variant="outline" onClick={() => void fetchNextPage()}>
            Load more
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">You&apos;re all caught up ✨</p>
        )}
      </div>}
    </div>
  );
}
