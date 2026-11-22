"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="surface mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred{error.digest ? ` (ref ${error.digest})` : ""}. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
