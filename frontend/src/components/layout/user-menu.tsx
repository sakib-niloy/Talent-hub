"use client";

import { LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useMe, useSignout } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, isLoading } = useMe();
  const signout = useSignout();
  const router = useRouter();

  if (isLoading) return <Skeleton className={cn("rounded-full", compact ? "size-9" : "h-12 w-full rounded-xl")} />;

  if (!user) {
    return (
      <div className={cn("flex gap-2", !compact && "flex-col")}>
        <Button asChild variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "lg"}>
          <Link href="/signin">Sign in</Link>
        </Button>
        <Button asChild size={compact ? "sm" : "lg"} className="bg-brand text-white hover:opacity-90">
          <Link href="/signup">{compact ? "Join" : "Create account"}</Link>
        </Button>
      </div>
    );
  }

  const onSignout = () =>
    signout.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out");
        router.push("/");
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button type="button" className="rounded-full" aria-label="Account menu">
            <UserAvatar user={user} />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent"
            aria-label="Account menu"
          >
            <UserAvatar user={user} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">@{user.handle}</span>
            </span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${user.handle}`}>
            <User /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignout} disabled={signout.isPending}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
