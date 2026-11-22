"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import type { Media } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { CommentLink, LikeButton, MediaMenu, ShareButton, useLikeHandler } from "./media-actions";

export function AuthorRow({ media, className }: { media: Media; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link href={`/u/${media.author.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg">
        <UserAvatar user={media.author} className="size-8" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold">{media.author.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            @{media.author.handle} · <time dateTime={media.createdAt}>{timeAgo(media.createdAt)}</time>
          </span>
        </span>
      </Link>
      <MediaMenu media={media} />
    </div>
  );
}

/**
 * Photo with double-click-to-like and a heart burst. When `href` is set, a single click
 * opens the post (delayed slightly so a double-click can cancel it). Keyboard users use the title link.
 */
export function PhotoView({
  media,
  className,
  priority = false,
  href,
}: {
  media: Media;
  className?: string;
  priority?: boolean;
  href?: string;
}) {
  const onLike = useLikeHandler(media);
  const router = useRouter();
  const [burst, setBurst] = useState(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
  }, []);

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", href && "cursor-pointer", className)}
      onClick={() => {
        if (!href) return;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => router.push(href), 260);
      }}
      onDoubleClick={() => {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        onLike(true);
        setBurst((b) => b + 1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary storage hosts; see next.config */}
      <img
        src={media.url}
        alt={media.description || media.title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-auto w-full select-none object-cover"
        draggable={false}
      />
      {burst > 0 ? (
        <Heart
          key={burst}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-xl [animation:heart-burst_800ms_ease-out_forwards]"
        />
      ) : null}
    </div>
  );
}

export function VideoView({ media, className }: { media: Media; className?: string }) {
  return (
    <div className={cn("aspect-video overflow-hidden bg-black", className)}>
      <video src={media.url} controls playsInline preload="metadata" className="size-full object-contain" aria-label={media.title} />
    </div>
  );
}

export function MediaCard({ media, className }: { media: Media; className?: string }) {
  return (
    <article className={cn("surface glow-hover overflow-hidden", className)} aria-labelledby={`media-${media.id}-title`}>
      <AuthorRow media={media} className="p-3" />

      {media.kind === "photo" ? (
        <PhotoView media={media} href={`/m/${media.id}`} />
      ) : media.kind === "video" ? (
        <VideoView media={media} />
      ) : (
        <div className="px-3">
          <AudioPlayer src={media.url} seed={media.id} title={media.title} />
        </div>
      )}

      <div className="space-y-1 px-4 pt-3">
        <h3 id={`media-${media.id}-title`} className="font-semibold leading-snug">
          <Link href={`/m/${media.id}`} className="hover:underline">
            {media.title}
          </Link>
        </h3>
        {media.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{media.description}</p> : null}
      </div>

      <div className="flex items-center gap-1 px-2 py-2">
        <LikeButton media={media} />
        <CommentLink media={media} />
        <div className="ml-auto">
          <ShareButton media={media} />
        </div>
      </div>
    </article>
  );
}
