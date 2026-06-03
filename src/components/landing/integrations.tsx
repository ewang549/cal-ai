"use client";

import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type CharProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

function Character({ char, index, centerIndex, scrollYProgress }: CharProps) {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(
    scrollYProgress,
    [0, 0.5],
    [distanceFromCenter * 50, 0],
  );
  const rotateX = useTransform(
    scrollYProgress,
    [0, 0.5],
    [distanceFromCenter * 50, 0],
  );
  return (
    <motion.span
      className={cn("inline-block", isSpace && "w-3 sm:w-5")}
      style={{ x, rotateX }}
    >
      {char}
    </motion.span>
  );
}

type IconProps = {
  src: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

function IconTile({ src, index, centerIndex, scrollYProgress }: IconProps) {
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(
    scrollYProgress,
    [0, 0.5],
    [distanceFromCenter * 60, 0],
  );
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.7, 1]);
  const y = useTransform(
    scrollYProgress,
    [0, 0.5],
    [Math.abs(distanceFromCenter) * 60, 0],
  );

  return (
    <motion.div
      className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-rule bg-surface shadow-[0_10px_30px_-15px_rgba(26,22,18,0.2)] will-change-transform sm:size-24"
      style={{ x, scale, y, transformOrigin: "center" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="size-9 object-contain opacity-80 sm:size-10"
      />
    </motion.div>
  );
}

const TEXT = "lives where your calendar lives";
const ICONS = [
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/googlecalendar.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/apple.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/microsoftoutlook.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/anthropic.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/gmail.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/slack.svg",
];

export function Integrations() {
  const textRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: textProgress } = useScroll({
    target: textRef,
    offset: ["start end", "end start"],
  });
  const { scrollYProgress: iconProgress } = useScroll({
    target: iconRef,
    offset: ["start end", "end start"],
  });

  const chars = TEXT.split("");
  const centerIndex = Math.floor(chars.length / 2);
  const iconCenterIndex = Math.floor(ICONS.length / 2);

  return (
    <section className="relative border-t border-rule/40 bg-cream-deep/40">
      {/* block 1 — characters spread → assemble */}
      <div
        ref={textRef}
        className="relative flex h-[170vh] items-center justify-center overflow-hidden px-6 sm:px-10"
      >
        <div className="sticky top-[40vh]">
          <div className="text-center font-mono text-xs tracking-[0.22em] uppercase text-accent">
            Built for the way you work
          </div>
          <h2
            className="font-display mt-5 max-w-[16ch] text-center text-4xl font-medium leading-[1] tracking-tight text-ink sm:text-6xl lg:text-[5.5rem]"
            style={{ perspective: "600px" }}
            aria-label={TEXT}
          >
            {chars.map((char, i) => (
              <Character
                key={i}
                char={char}
                index={i}
                centerIndex={centerIndex}
                scrollYProgress={textProgress}
              />
            ))}
          </h2>
        </div>
      </div>

      {/* block 2 — icons scale/spread → settle */}
      <div
        ref={iconRef}
        className="relative -mt-[60vh] flex h-[170vh] flex-col items-center justify-center overflow-hidden px-6 sm:px-10"
      >
        <div className="sticky top-[35vh] flex flex-col items-center gap-10">
          <div className="text-center">
            <div className="font-mono text-xs tracking-[0.22em] uppercase text-muted">
              Connects with
            </div>
            <div className="font-display mt-3 text-2xl italic text-ink-soft sm:text-3xl">
              the tools you already use.
            </div>
          </div>
          <div
            className="flex flex-wrap items-center justify-center gap-5 sm:gap-7"
            style={{ perspective: "600px" }}
          >
            {ICONS.map((src, i) => (
              <IconTile
                key={i}
                src={src}
                index={i}
                centerIndex={iconCenterIndex}
                scrollYProgress={iconProgress}
              />
            ))}
          </div>
          <p className="max-w-md text-center text-sm text-muted">
            Google Calendar today. Apple Calendar, Outlook, and the rest rolling out
            during early access.
          </p>
        </div>
      </div>
    </section>
  );
}
