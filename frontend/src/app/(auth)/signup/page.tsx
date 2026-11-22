import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-2xl" />}>
      <SignupForm />
    </Suspense>
  );
}
