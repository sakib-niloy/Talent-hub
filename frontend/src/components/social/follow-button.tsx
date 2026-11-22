"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/use-social";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Follow toggle. Pass `isFollowing` when known (profile pages); suggestion lists start as
 * "not following" because the API only suggests people you don't follow yet.
 */
export function FollowButton({
  handle,
  isFollowing,
  size = "default",
  className,
}: {
  handle: string;
  isFollowing?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const follow = useFollow(handle);
  const [local, setLocal] = useState(false);
  const following = isFollowing ?? local;

  const toggle = () => {
    const next = !following;
    setLocal(next);
    follow.mutate(next, {
      onError: (e) => {
        setLocal(!next);
        toast.error(errorMessage(e));
      },
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      onClick={toggle}
      disabled={follow.isPending}
      aria-pressed={following}
      className={cn(!following && "bg-foreground text-background hover:bg-foreground/85", className)}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
