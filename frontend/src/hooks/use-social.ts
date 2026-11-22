"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/endpoints";
import type { CurrentUser, Profile } from "@/lib/api/types";
import { meKey } from "./use-auth";

export const profileKey = (handle: string) => ["profile", handle] as const;

export function useProfile(handle: string) {
  return useQuery({ queryKey: profileKey(handle), queryFn: () => usersApi.profile(handle), enabled: !!handle });
}

export function useSuggestions(limit = 5, enabled = true) {
  return useQuery({
    queryKey: ["users", "suggestions", limit],
    queryFn: () => usersApi.suggestions(limit),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useFollowList(handle: string, which: "followers" | "following", enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["users", handle, which],
    queryFn: ({ pageParam }) =>
      which === "followers" ? usersApi.followers(handle, pageParam) : usersApi.following(handle, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled,
  });
}

export function useFollow(handle: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? usersApi.follow(handle) : usersApi.unfollow(handle)),
    onMutate: async (follow) => {
      await qc.cancelQueries({ queryKey: profileKey(handle) });
      const prev = qc.getQueryData<Profile>(profileKey(handle));
      if (prev) {
        qc.setQueryData<Profile>(profileKey(handle), {
          ...prev,
          isFollowing: follow,
          followerCount: Math.max(0, prev.followerCount + (follow === prev.isFollowing ? 0 : follow ? 1 : -1)),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(profileKey(handle), ctx.prev);
    },
    onSuccess: (res) => {
      qc.setQueryData<Profile>(profileKey(handle), (p) =>
        p ? { ...p, isFollowing: res.isFollowing, followerCount: res.followerCount } : p,
      );
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["media", "list", { feed: "following" }] });
      const me = qc.getQueryData<CurrentUser | null>(meKey);
      if (me) void qc.invalidateQueries({ queryKey: profileKey(me.handle) });
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (user) => {
      qc.setQueryData(meKey, user);
      void qc.invalidateQueries({ queryKey: profileKey(user.handle) });
    },
  });
}
