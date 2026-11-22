"use client";

import { Pause, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Deterministic pseudo-waveform bars from a seed (purely decorative). */
function bars(seed: number, count: number) {
  let x = seed * 9301 + 49297;
  return Array.from({ length: count }, () => {
    x = (x * 9301 + 49297) % 233280;
    return 0.25 + (x / 233280) * 0.75;
  });
}

export function AudioPlayer({ src, seed, title, large = false }: { src: string; seed: number; title: string; large?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const waveform = useMemo(() => bars(seed, large ? 64 : 40), [seed, large]);
  const progress = duration ? current / duration : 0;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      // Pause any other playing audio on the page.
      document.querySelectorAll("audio").forEach((a) => a !== el && a.pause());
      void el.play();
    } else el.pause();
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (el && duration) {
      el.currentTime = value;
      setCurrent(value);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-transparent p-4", large && "p-6")}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-brand text-white shadow-lg shadow-fuchsia-500/25 transition-transform hover:scale-105 active:scale-95",
            large ? "size-16" : "size-12",
          )}
        >
          {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 translate-x-px" fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-center gap-[3px]", large ? "h-16" : "h-10")} aria-hidden>
            {waveform.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors",
                  i / waveform.length <= progress ? "bg-gradient-to-t from-indigo-500 to-fuchsia-500" : "bg-foreground/15",
                )}
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label={`Seek ${title}`}
              className="h-1 w-full cursor-pointer accent-[var(--brand-to)]"
            />
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {formatDuration(current)} / {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
