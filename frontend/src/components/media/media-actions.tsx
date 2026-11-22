"use client";

import { Heart, MessageCircle, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks/use-auth";
import { useDeleteMedia, useToggleLike } from "@/hooks/use-media";
import { errorMessage } from "@/lib/api/client";
import type { Media } from "@/lib/api/types";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Returns a like handler that redirects signed-out users to sign in. */
export function useLikeHandler(media: Media) {
  const { user } = useMe();
  const toggle = useToggleLike();
  const router = useRouter();
  return (forceLike = false) => {
    if (!user) {
      toast("Sign in to like posts", {
        action: { label: "Sign in", onClick: () => router.push(`/signin?next=${encodeURIComponent(`/m/${media.id}`)}`) },
      });
      return;
    }
    if (forceLike && media.likedByMe) return;
    toggle.mutate({ media }, { onError: (e) => toast.error(errorMessage(e)) });
  };
}

export function LikeButton({ media }: { media: Media }) {
  const onLike = useLikeHandler(media);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onLike()}
      aria-pressed={media.likedByMe}
      aria-label={media.likedByMe ? "Unlike" : "Like"}
      className={cn("gap-1.5 tabular-nums", media.likedByMe && "text-rose-500 hover:text-rose-500")}
    >
      <Heart className={cn("size-4.5 transition-transform", media.likedByMe && "scale-110 fill-current")} />
      {formatCount(media.likeCount)}
    </Button>
  );
}

export function CommentLink({ media }: { media: Media }) {
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1.5 tabular-nums">
      <Link href={`/m/${media.id}#comments`} aria-label={`${media.commentCount} comments`}>
        <MessageCircle className="size-4.5" />
        {formatCount(media.commentCount)}
      </Link>
    </Button>
  );
}

export function ShareButton({ media }: { media: Media }) {
  const share = async () => {
    const url = `${window.location.origin}/m/${media.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: media.title, text: `${media.title} by ${media.author.name} on TalentHub`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") toast.error("Couldn't share this post");
    }
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={share} aria-label="Share">
      <Share2 className="size-4.5" />
    </Button>
  );
}

/** Overflow menu with delete, shown to the owner or an admin. */
export function MediaMenu({ media }: { media: Media }) {
  const { user } = useMe();
  const del = useDeleteMedia();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  if (!user || (user.id !== media.author.id && user.role !== "admin")) return null;

  const onDelete = () =>
    del.mutate(media.id, {
      onSuccess: () => {
        toast.success("Post deleted");
        setConfirm(false);
        if (pathname === `/m/${media.id}`) router.replace("/feed");
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="More options">
            <MoreHorizontal className="size-4.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete{user.id !== media.author.id ? " (admin)" : ""}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{media.title}” and all of its likes and comments will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={del.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
