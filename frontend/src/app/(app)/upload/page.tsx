"use client";

import { RequireAuth } from "@/components/require-auth";
import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <RequireAuth>
      {() => (
        <div className="space-y-6">
          <header>
            <h1 className="font-heading text-4xl tracking-tight">Share your work</h1>
            <p className="text-sm text-muted-foreground">Upload a photo, a track or a video. It goes straight to secure storage.</p>
          </header>
          <UploadForm />
        </div>
      )}
    </RequireAuth>
  );
}
