import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SigninForm } from "./signin-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SigninPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <SigninForm />
    </Suspense>
  );
}
