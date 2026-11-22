"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileImage, Heart, MessageCircle, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { mediaKeys, removeMediaEverywhere, useMediaFeed } from "@/hooks/use-media";
import { errorMessage } from "@/lib/api/client";
import { adminApi } from "@/lib/api/endpoints";
import type { AdminUser, CurrentUser, Role, UserStatus } from "@/lib/api/types";
import { formatCount, timeAgo } from "@/lib/format";
import { formatBytes } from "@/lib/media-rules";

function StatCards() {
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  const cards = [
    { label: "Users", icon: Users, value: data?.users },
    { label: "Posts", icon: FileImage, value: data?.media },
    { label: "Comments", icon: MessageCircle, value: data?.comments },
    { label: "Likes", icon: Heart, value: data?.likes },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, icon: Icon, value }) => (
        <div key={label} className="surface p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {label}
            <Icon className="size-4" aria-hidden />
          </div>
          {isPending ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums">{formatCount(value ?? 0)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersTable({ me }: { me: CurrentUser }) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["admin", "users", query],
    queryFn: ({ pageParam }) => adminApi.users(query || undefined, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: { status?: UserStatus; role?: Role } }) => adminApi.updateUser(id, patch),
    onSuccess: (user) => {
      toast.success(`Updated @${user.handle}`);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const users: AdminUser[] = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, handle or email"
          aria-label="Search users"
          className="pl-9"
        />
      </div>
      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <div className="surface overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Posts</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : users.map((u) => {
                    const self = u.id === me.id;
                    const pending = update.isPending && update.variables?.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Link href={`/u/${u.handle}`} className="flex items-center gap-2.5 hover:underline">
                            <UserAvatar user={u} className="size-8" />
                            <span className="min-w-0">
                              <span className="block max-w-40 truncate font-medium">{u.name}</span>
                              <span className="block text-xs text-muted-foreground">@{u.handle}</span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">{u.email}</TableCell>
                        <TableCell className="hidden tabular-nums sm:table-cell">{u.mediaCount}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            disabled={self || pending}
                            onValueChange={(role) => update.mutate({ id: u.id, patch: { role: role as Role } })}
                          >
                            <SelectTrigger size="sm" className="w-24" aria-label={`Role for ${u.name}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.status === "blocked" ? "destructive" : "secondary"}>{u.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={u.status === "blocked" ? "outline" : "destructive"}
                            disabled={self || pending}
                            onClick={() =>
                              update.mutate({ id: u.id, patch: { status: u.status === "blocked" ? "active" : "blocked" } })
                            }
                          >
                            {u.status === "blocked" ? "Unblock" : "Block"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isPending && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No users match “{query}”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
      {hasNextPage ? (
        <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

function ContentTable() {
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useMediaFeed({ limit: 20 });
  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteMedia(id),
    onSuccess: (_r, id) => {
      removeMediaEverywhere(qc, id);
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      void qc.invalidateQueries({ queryKey: mediaKeys.all });
      toast.success("Post removed");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />;
  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead className="hidden sm:table-cell">Author</TableHead>
              <TableHead className="hidden md:table-cell">Size</TableHead>
              <TableHead className="hidden md:table-cell">Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending
              ? Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/m/${m.id}`} className="flex items-center gap-2 hover:underline">
                        <Badge variant="outline" className="capitalize">
                          {m.kind}
                        </Badge>
                        <span className="max-w-48 truncate font-medium">{m.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">@{m.author.handle}</TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">{formatBytes(m.sizeBytes)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{timeAgo(m.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={del.isPending && del.variables === m.id}
                        onClick={() => {
                          if (window.confirm(`Delete “${m.title}” permanently?`)) del.mutate(m.id);
                        }}
                        aria-label={`Delete ${m.title}`}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!isPending && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No posts yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      {hasNextPage ? (
        <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

export function AdminDashboard({ me }: { me: CurrentUser }) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-4xl tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Moderate users and content.</p>
      </header>
      <StatCards />
      <Tabs defaultValue="users">
        <TabsList className="h-10">
          <TabsTrigger value="users" className="px-3.5">
            Users
          </TabsTrigger>
          <TabsTrigger value="content" className="px-3.5">
            Content
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <UsersTable me={me} />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <ContentTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
