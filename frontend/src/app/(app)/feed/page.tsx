import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/media/media-feed";
import { FeedView } from "./feed-view";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedView />
    </Suspense>
  );
}
