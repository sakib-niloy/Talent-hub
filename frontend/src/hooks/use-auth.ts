"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/endpoints";
import type { CurrentUser } from "@/lib/api/types";

export const meKey = ["auth", "me"] as const;

export function useMe() {
  const query = useQuery({
    queryKey: meKey,
    queryFn: authApi.me,
    staleTime: 5 * 60 * 1000,
  });
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProviders() {
  return useQuery({ queryKey: ["auth", "providers"], queryFn: authApi.providers, staleTime: 60 * 60 * 1000 });
}

function useSetSession() {
  const qc = useQueryClient();
  return (user: CurrentUser | null) => {
    qc.setQueryData(meKey, user);
    // Viewer-dependent fields (likedByMe, isFollowing, canDelete) must be refetched.
    void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
  };
}

export function useSignin() {
  const setSession = useSetSession();
  return useMutation({ mutationFn: authApi.signin, onSuccess: setSession });
}

export function useSignup() {
  const setSession = useSetSession();
  return useMutation({ mutationFn: authApi.signup, onSuccess: setSession });
}

export function useSignout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.signout,
    onSettled: () => {
      qc.setQueryData(meKey, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    },
  });
}
