import { Compass } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <Brand />
        <p className="font-heading text-8xl text-brand">404</p>
        <h1 className="text-2xl font-semibold">This page wandered off</h1>
        <p className="text-muted-foreground">The link may be broken, or the page may have been removed.</p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/feed">
              <Compass /> Go to feed
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
