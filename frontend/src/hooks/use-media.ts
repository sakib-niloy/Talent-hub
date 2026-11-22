"use client";

import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { mediaApi, type MediaListParams } from "@/lib/api/endpoints";
import type { Media, Page } from "@/lib/api/types";

export const mediaKeys = {
  all: ["media"] as const,
  list: (params: MediaListParams) => ["media", "list", params] as const,
  detail: (id: number) => ["media", "detail", id] as const,
};

export function useMediaFeed(params: MediaListParams, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: mediaKeys.list(params),
    queryFn: ({ pageParam }) => mediaApi.list(params, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
  });
}

export function useMedia(id: number) {
  return useQuery({
    queryKey: mediaKeys.detail(id),
    queryFn: () => mediaApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

type MediaCache = Media | InfiniteData<Page<Media>, string | undefined> | undefined;

/** Apply a patch to a media item everywhere it is cached (detail + every list). */
export function patchMediaEverywhere(qc: QueryClient, id: number, patch: (m: Media) => Media) {
  qc.setQueriesData<MediaCache>({ queryKey: mediaKeys.all }, (old) => {
    if (!old) return old;
    if ("pages" in old) {
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, data: p.data.map((m) => (m.id === id ? patch(m) : m)) })),
      };
    }
    return old.id === id ? patch(old) : old;
  });
}

export function removeMediaEverywhere(qc: QueryClient, id: number) {
  qc.setQueriesData<MediaCache>({ queryKey: [...mediaKeys.all, "list"] }, (old) => {
    if (!old || !("pages" in old)) return old;
    return { ...old, pages: old.pages.map((p) => ({ ...p, data: p.data.filter((m) => m.id !== id) })) };
  });
  qc.removeQueries({ queryKey: mediaKeys.detail(id) });
}

/** Optimistic like / unlike. */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ media }: { media: Media }) => (media.likedByMe ? mediaApi.unlike(media.id) : mediaApi.like(media.id)),
    onMutate: async ({ media }) => {
      await qc.cancelQueries({ queryKey: mediaKeys.all });
      const snapshot = qc.getQueriesData<MediaCache>({ queryKey: mediaKeys.all });
      const liked = !media.likedByMe;
      patchMediaEverywhere(qc, media.id, (m) => ({
        ...m,
        likedByMe: liked,
        likeCount: Math.max(0, m.likeCount + (liked ? 1 : -1)),
      }));
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (res, { media }) => {
      patchMediaEverywhere(qc, media.id, (m) => ({ ...m, likedByMe: res.liked, likeCount: res.likeCount }));
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mediaApi.remove(id),
    onSuccess: (_res, id) => {
      removeMediaEverywhere(qc, id);
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
