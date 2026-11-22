"use client";

import { Camera, Clapperboard, Heart, MessageCircle, Music, Play } from "lucide-react";
import { motion } from "motion/react";

const TILES = [
  { icon: Camera, label: "Golden hour, Lisbon", tint: "from-amber-400 via-rose-500 to-fuchsia-600", className: "row-span-2", delay: 0 },
  { icon: Music, label: "Lo-fi sketch #12", tint: "from-indigo-500 via-violet-500 to-fuchsia-500", className: "", delay: 0.08 },
  { icon: Clapperboard, label: "Street dance reel", tint: "from-sky-400 via-indigo-500 to-violet-600", className: "", delay: 0.16 },
  { icon: Camera, label: "Monsoon portraits", tint: "from-emerald-400 via-teal-500 to-sky-600", className: "", delay: 0.24 },
  { icon: Music, label: "Sitar × synth", tint: "from-fuchsia-500 via-pink-500 to-orange-400", className: "row-span-2", delay: 0.32 },
  { icon: Clapperboard, label: "Short film teaser", tint: "from-zinc-700 via-indigo-700 to-fuchsia-700", className: "", delay: 0.4 },
];

export function HeroCollage() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-10 -z-10 rounded-full bg-brand opacity-25 blur-3xl" />
      <div className="grid auto-rows-[7.5rem] grid-cols-3 gap-3 sm:auto-rows-[9rem]">
        {TILES.map(({ icon: Icon, label, tint, className, delay }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${tint} ${className} shadow-xl ring-1 ring-white/10`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
            <Icon className="absolute right-3 top-3 size-5 text-white/80" />
            {Icon === Clapperboard ? (
              <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 backdrop-blur">
                <Play className="size-4 translate-x-px fill-white text-white" />
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/50 to-transparent p-3 text-white">
              <span className="truncate text-xs font-medium">{label}</span>
              <span className="flex shrink-0 items-center gap-2 text-[10px] text-white/80">
                <Heart className="size-3 fill-current" /> {(i + 3) * 37}
                <MessageCircle className="size-3" /> {(i + 1) * 4}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
