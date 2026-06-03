"use client";

import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { useRef } from "react";

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

const ICONS = [
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/googlecalendar.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/apple.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/notion.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/anthropic.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/gmail.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/slack.svg",
];

export function Integrations() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const centerIndex = Math.floor(ICONS.length / 2);

  return (
    <section className="relative border-t border-rule/40 bg-cream-deep/40">
      <div
        ref={ref}
        className="relative flex h-[80vh] flex-col items-center justify-center overflow-hidden px-6 sm:px-10"
      >
        <div className="sticky top-[22vh] flex flex-col items-center gap-8">
          <div className="text-center">
            <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
              Connects with
            </div>
            <h2 className="font-display mt-3 text-3xl italic text-ink sm:text-4xl">
              the tools you already use.
            </h2>
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
                centerIndex={centerIndex}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </div>
          <p className="max-w-md text-center text-sm text-muted">
            Google Calendar today. Apple Calendar, Outlook, and more rolling out
            during early access.
          </p>
        </div>
      </div>
    </section>
  );
}
