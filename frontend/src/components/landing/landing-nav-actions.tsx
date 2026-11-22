"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-auth";

export function LandingNavActions() {
  const { user } = useMe();
  if (user) {
    return (
      <Button asChild size="sm" className="bg-brand text-white hover:opacity-90">
        <Link href="/feed">Open TalentHub</Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/signin">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="bg-brand text-white hover:opacity-90">
        <Link href="/signup">Get started</Link>
      </Button>
    </div>
  );
}
