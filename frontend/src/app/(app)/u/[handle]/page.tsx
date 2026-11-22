import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileSkeleton, ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileView params={params} />
    </Suspense>
  );
}
