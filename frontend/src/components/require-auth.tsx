"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-auth";
import type { CurrentUser } from "@/lib/api/types";
import { EmptyState } from "@/components/empty-state";

/** Client-side route guard. Redirects signed-out visitors to /signin?next=<current path>. */
export function RequireAuth({
  children,
  role,
}: {
  children: (user: CurrentUser) => React.ReactNode;
  role?: "admin";
}) {
  const { user, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (role && user.role !== role) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="You don't have access to this page."
        action={{ href: "/feed", label: "Back to feed" }}
      />
    );
  }

  return <>{children(user)}</>;
}
