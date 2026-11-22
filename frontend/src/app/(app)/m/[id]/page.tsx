import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaDetail, MediaDetailSkeleton } from "./media-detail";

export const metadata: Metadata = { title: "Post" };

export default function MediaPage({ params }: PageProps<"/m/[id]">) {
  return (
    <Suspense fallback={<MediaDetailSkeleton />}>
      <MediaDetail params={params} />
    </Suspense>
  );
}
