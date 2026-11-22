"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useMe } from "@/hooks/use-auth";
import { useAddComment, useComments, useDeleteComment } from "@/hooks/use-comments";
import { errorMessage } from "@/lib/api/client";
import { timeAgo } from "@/lib/format";

const schema = z.object({
  body: z.string().trim().min(1, "Write something first").max(2000, "Comments can be at most 2000 characters"),
});

export function CommentThread({ mediaId }: { mediaId: number }) {
  const { user } = useMe();
  const { data, isPending, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = useComments(mediaId);
  const add = useAddComment(mediaId);
  const del = useDeleteComment(mediaId);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { body: "" } });

  const onSubmit = form.handleSubmit(({ body }) =>
    add.mutateAsync(body).then(
      () => form.reset({ body: "" }),
      (e) => toast.error(errorMessage(e)),
    ),
  );

  const comments = data?.pages.flatMap((p) => p.data) ?? [];
  const bodyError = form.formState.errors.body?.message;

  return (
    <section id="comments" aria-labelledby="comments-title" className="space-y-4 scroll-mt-24">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-semibold">
        <MessageCircle className="size-5" aria-hidden /> Comments
      </h2>

      {user ? (
        <form onSubmit={onSubmit} className="flex gap-3" noValidate>
          <UserAvatar user={user} className="mt-1 size-8" />
          <div className="flex-1 space-y-2">
            <label htmlFor="comment-body" className="sr-only">
              Add a comment
            </label>
            <Textarea
              id="comment-body"
              placeholder="Add a thoughtful comment…"
              rows={2}
              aria-invalid={!!bodyError}
              aria-describedby={bodyError ? "comment-error" : undefined}
              {...form.register("body")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void onSubmit();
              }}
            />
            <div className="flex items-center justify-between">
              <p id="comment-error" className="text-xs text-destructive">
                {bodyError}
              </p>
              <Button type="submit" size="sm" disabled={add.isPending}>
                {add.isPending ? <Loader2 className="animate-spin" /> : null} Post
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="surface p-4 text-sm text-muted-foreground">
          <Link href={`/signin?next=/m/${mediaId}`} className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          {errorMessage(error)}{" "}
          <button type="button" className="text-primary underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="group flex gap-3">
              <Link href={`/u/${c.author.handle}`} aria-label={c.author.name} className="shrink-0 rounded-full">
                <UserAvatar user={c.author} className="size-8" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/u/${c.author.handle}`} className="font-semibold hover:underline">
                    {c.author.name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">
                    · <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                  </span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
              </div>
              {c.canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete comment"
                  className="opacity-60 hover:opacity-100 focus-visible:opacity-100"
                  disabled={del.isPending && del.variables === c.id}
                  onClick={() => del.mutate(c.id, { onError: (e) => toast.error(errorMessage(e)) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {hasNextPage ? (
        <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading…" : "Load more comments"}
        </Button>
      ) : null}
    </section>
  );
}
