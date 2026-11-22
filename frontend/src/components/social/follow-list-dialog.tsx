"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useFollowList } from "@/hooks/use-social";
import { errorMessage } from "@/lib/api/client";

export function FollowListDialog({
  handle,
  which,
  open,
  onOpenChange,
}: {
  handle: string;
  which: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useFollowList(handle, which, open);
  const users = data?.pages.flatMap((p) => p.data) ?? [];
  const title = which === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>@{handle}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60dvh] pr-2">
          {isPending ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {which === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.handle}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                  >
                    <UserAvatar user={u} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">@{u.handle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage ? (
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
