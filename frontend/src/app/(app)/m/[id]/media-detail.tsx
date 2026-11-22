"use client";

import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { AudioPlayer } from "@/components/media/audio-player";
import { AuthorRow, PhotoView, VideoView } from "@/components/media/media-card";
import { LikeButton, ShareButton } from "@/components/media/media-actions";
import { CommentThread } from "@/components/social/comment-thread";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMedia } from "@/hooks/use-media";
import { ApiError, errorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/media-rules";

export function MediaDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-label="Loading post">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function MediaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = Number.parseInt(rawId, 10);
  const router = useRouter();
  const { data: media, isPending, isError, error, refetch } = useMedia(id);

  if (!Number.isFinite(id) || id <= 0 || (error instanceof ApiError && error.status === 404)) {
    return (
      <EmptyState
        icon={SearchX}
        title="Post not found"
        description="It may have been deleted, or the link is wrong."
        action={{ href: "/feed", label: "Back to feed" }}
      />
    );
  }
  if (isPending) return <MediaDetailSkeleton />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <article className="mx-auto max-w-3xl space-y-6" aria-labelledby="media-title">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/feed"))}
      >
        <ArrowLeft /> Back
      </Button>

      <div className="surface overflow-hidden">
        {media.kind === "photo" ? (
          <PhotoView media={media} priority className="max-h-[80dvh] [&_img]:max-h-[80dvh] [&_img]:object-contain" />
        ) : media.kind === "video" ? (
          <VideoView media={media} />
        ) : (
          <div className="p-4">
            <AudioPlayer src={media.url} seed={media.id} title={media.title} large />
          </div>
        )}
        <div className="flex items-center gap-1 border-t px-2 py-2">
          <LikeButton media={media} />
          <ShareButton media={media} />
          <span className="ml-auto pr-3 text-xs text-muted-foreground">
            {media.kind} · {formatBytes(media.sizeBytes)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h1 id="media-title" className="font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
          {media.title}
        </h1>
        <AuthorRow media={media} />
        {media.description ? (
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{media.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">Posted {formatDate(media.createdAt)}</p>
      </div>

      <hr />
      <CommentThread mediaId={media.id} />

      <p className="text-center text-sm">
        <Link href={`/u/${media.author.handle}`} className="text-primary hover:underline">
          More from {media.author.name} →
        </Link>
      </p>
    </article>
  );
}
