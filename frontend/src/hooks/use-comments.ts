"use client";

import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@/lib/api/endpoints";
import type { Comment, Page } from "@/lib/api/types";
import { patchMediaEverywhere } from "./use-media";

export const commentKeys = { list: (mediaId: number) => ["comments", mediaId] as const };

type CommentPages = InfiniteData<Page<Comment>, string | undefined>;

export function useComments(mediaId: number) {
  return useInfiniteQuery({
    queryKey: commentKeys.list(mediaId),
    queryFn: ({ pageParam }) => mediaApi.comments(mediaId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
}

export function useAddComment(mediaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => mediaApi.addComment(mediaId, body),
    onSuccess: (comment) => {
      qc.setQueryData<CommentPages>(commentKeys.list(mediaId), (old) => {
        if (!old || old.pages.length === 0) return old;
        const pages = [...old.pages];
        const last = pages[pages.length - 1]!;
        // Comments are oldest-first; only append if we've loaded the final page.
        if (last.meta.nextCursor === null) pages[pages.length - 1] = { ...last, data: [...last.data, comment] };
        return { ...old, pages };
      });
      patchMediaEverywhere(qc, mediaId, (m) => ({ ...m, commentCount: m.commentCount + 1 }));
    },
  });
}

export function useDeleteComment(mediaId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => mediaApi.deleteComment(commentId),
    onSuccess: (_res, commentId) => {
      qc.setQueryData<CommentPages>(commentKeys.list(mediaId), (old) =>
        old
          ? { ...old, pages: old.pages.map((p) => ({ ...p, data: p.data.filter((c) => c.id !== commentId) })) }
          : old,
      );
      patchMediaEverywhere(qc, mediaId, (m) => ({ ...m, commentCount: Math.max(0, m.commentCount - 1) }));
    },
  });
}
