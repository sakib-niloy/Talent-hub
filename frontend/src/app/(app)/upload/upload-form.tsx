"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileAudio, FileVideo, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { mediaKeys } from "@/hooks/use-media";
import { errorMessage } from "@/lib/api/client";
import { mediaApi } from "@/lib/api/endpoints";
import type { MediaKind } from "@/lib/api/types";
import { putFile } from "@/lib/api/upload";
import { ACCEPT_ATTR, checkFile, formatBytes, MEDIA_RULES } from "@/lib/media-rules";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(1, "Give your work a title").max(120, "Titles can be at most 120 characters"),
  description: z.string().trim().max(2000, "Descriptions can be at most 2000 characters").optional(),
});
type Values = z.infer<typeof schema>;

type Phase =
  | { step: "pick" }
  | { step: "details" }
  | { step: "uploading"; progress: number }
  | { step: "finalizing" }
  | { step: "done"; mediaId: number };

const KIND_ICON: Record<MediaKind, typeof ImageIcon> = { photo: ImageIcon, audio: FileAudio, video: FileVideo };

function titleFromFilename(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 120);
}

export function UploadForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MediaKind | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "pick" });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "" } });

  // Revoke preview object URLs when replaced/unmounted.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const choose = (f: File | undefined | null) => {
    if (!f) return;
    const check = checkFile(f);
    if (!check.ok) {
      setFileError(check.error);
      return;
    }
    setFileError(null);
    setFile(f);
    setKind(check.kind);
    setPreview(URL.createObjectURL(f));
    if (!form.getValues("title")) form.setValue("title", titleFromFilename(f.name), { shouldValidate: true });
    setPhase({ step: "details" });
  };

  const reset = () => {
    abortRef.current?.abort();
    setFile(null);
    setKind(null);
    setPreview(null);
    setPhase({ step: "pick" });
    form.reset({ title: "", description: "" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const publish = async (values: Values) => {
    if (!file || !kind) return;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setPhase({ step: "uploading", progress: 0 });
      const ticket = await mediaApi.create({
        kind,
        title: values.title,
        description: values.description || undefined,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      await putFile(ticket, file, (p) => setPhase({ step: "uploading", progress: p }), controller.signal);
      setPhase({ step: "finalizing" });
      const media = await mediaApi.complete(ticket.mediaId);
      await qc.invalidateQueries({ queryKey: mediaKeys.all });
      void qc.invalidateQueries({ queryKey: ["profile"] });
      setPhase({ step: "done", mediaId: media.id });
      toast.success("Published! 🎉");
      router.push(`/m/${media.id}`);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      toast.error(errorMessage(err));
      setPhase({ step: "details" });
    }
  };

  const busy = phase.step === "uploading" || phase.step === "finalizing" || phase.step === "done";
  const KindIcon = kind ? KIND_ICON[kind] : UploadCloud;
  const errors = form.formState.errors;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Step 1: pick a file */}
      <div>
        {!file ? (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring",
              dragging ? "border-primary bg-primary/5" : "hover:border-primary/60 hover:bg-accent/40",
            )}
          >
            <span className="grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-fuchsia-500/20">
              <UploadCloud className="size-7" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold">Drop a file or click to browse</span>
              <span className="mt-1 block text-sm text-muted-foreground">Photos, audio or video</span>
            </span>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {Object.entries(MEDIA_RULES).map(([k, r]) => (
                <li key={k}>
                  <span className="capitalize">{k}</span>: {r.label}
                </li>
              ))}
            </ul>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="surface overflow-hidden">
            <div className="grid min-h-64 place-items-center bg-muted">
              {kind === "photo" && preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={preview} alt="Preview of the selected photo" className="max-h-[60dvh] w-full object-contain" />
              ) : kind === "video" && preview ? (
                <video src={preview} controls className="max-h-[60dvh] w-full bg-black" />
              ) : kind === "audio" && preview ? (
                <div className="w-full p-6">
                  <audio src={preview} controls className="w-full" />
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3 p-3">
              <KindIcon className="size-5 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {kind} · {formatBytes(file.size)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={reset} aria-label="Remove file" disabled={phase.step === "finalizing" || phase.step === "done"}>
                <X />
              </Button>
            </div>
          </div>
        )}
        {fileError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>

      {/* Step 2: details + publish */}
      <form onSubmit={(e) => void form.handleSubmit(publish)(e)} className="surface space-y-5 p-5" noValidate>
        <ol className="flex items-center gap-2 text-xs font-medium text-muted-foreground" aria-label="Progress">
          {["Choose file", "Details", "Publish"].map((label, i) => {
            const current = phase.step === "pick" ? 0 : phase.step === "details" ? 1 : 2;
            return (
              <li key={label} className={cn("flex items-center gap-2", i <= current && "text-foreground")} aria-current={i === current ? "step" : undefined}>
                <span className={cn("grid size-5 place-items-center rounded-full border text-[10px]", i <= current && "border-transparent bg-brand text-white")}>
                  {i + 1}
                </span>
                {label}
                {i < 2 ? <span className="mx-1 h-px w-4 bg-border" aria-hidden /> : null}
              </li>
            );
          })}
        </ol>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" disabled={!file || busy} aria-invalid={!!errors.title} aria-describedby="title-error" {...form.register("title")} />
          <p id="title-error" className="text-xs text-destructive">
            {errors.title?.message}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="description"
            rows={5}
            disabled={!file || busy}
            placeholder="Tell people about this piece: the story, gear, collaborators…"
            aria-invalid={!!errors.description}
            aria-describedby="description-error"
            {...form.register("description")}
          />
          <p id="description-error" className="text-xs text-destructive">
            {errors.description?.message}
          </p>
        </div>

        {phase.step === "uploading" || phase.step === "finalizing" || phase.step === "done" ? (
          <div className="space-y-2" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {phase.step === "done" ? (
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                ) : (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {phase.step === "uploading" ? "Uploading…" : phase.step === "finalizing" ? "Verifying & publishing…" : "Published!"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {phase.step === "uploading" ? `${Math.round(phase.progress * 100)}%` : "100%"}
              </span>
            </div>
            <Progress value={phase.step === "uploading" ? phase.progress * 100 : 100} aria-label="Upload progress" />
            {phase.step === "uploading" ? (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" size="lg" disabled={!file || busy} className="w-full bg-brand text-white hover:opacity-90">
          {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          Publish
        </Button>
      </form>
    </div>
  );
}
