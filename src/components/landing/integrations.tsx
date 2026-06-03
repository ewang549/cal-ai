"use client";

import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { Fragment, useRef } from "react";

import { cn } from "@/lib/utils";

type CharProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

function Character({ char, index, centerIndex, scrollYProgress }: CharProps) {
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
    <motion.span className="inline-block" style={{ x, rotateX }}>
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

const TEXT = "wherever you work";
const ICONS = [
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/googlecalendar.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/apple.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/notion.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/anthropic.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/gmail.svg",
  "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/slack.svg",
];

/** Pre-compute character indices per word so each character keeps its
 * global position (needed for the spread-from-center math) while words
 * stay on their own line if the container is narrow. */
const WORDS = (() => {
  let g = 0;
  const result = TEXT.split(" ").map((word) => {
    const chars = word.split("").map((char) => ({ char, idx: g++ }));
    return { chars };
  });
  return { groups: result, total: g };
})();
const CENTER = Math.floor(WORDS.total / 2);

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

  const iconCenter = Math.floor(ICONS.length / 2);

  return (
    <section className="relative border-t border-rule/40 bg-cream-deep/40">
      {/* block 1 — text spread → assemble */}
      <div
        ref={textRef}
        className="relative flex h-[95vh] items-center justify-center overflow-hidden px-6 sm:px-10"
      >
        <div className="sticky top-[28vh]">
          <div className="text-center font-mono text-xs tracking-[0.22em] uppercase text-accent">
            Built for the way you work
          </div>
          <h2
            className="font-display mt-5 text-center text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            style={{ perspective: "600px" }}
            aria-label={TEXT}
          >
            {WORDS.groups.map((group, wi) => (
              <Fragment key={wi}>
                {wi > 0 && " "}
                <span className="inline-flex whitespace-nowrap">
                  {group.chars.map(({ char, idx }) => (
                    <Character
                      key={idx}
                      char={char}
                      index={idx}
                      centerIndex={CENTER}
                      scrollYProgress={textProgress}
                    />
                  ))}
                </span>
              </Fragment>
            ))}
          </h2>
        </div>
      </div>

      {/* block 2 — icons scale/spread → settle */}
      <div
        ref={iconRef}
        className="relative -mt-[10vh] flex h-[95vh] flex-col items-center justify-center overflow-hidden px-6 sm:px-10"
      >
        <div className="sticky top-[22vh] flex flex-col items-center gap-8">
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
                centerIndex={iconCenter}
                scrollYProgress={iconProgress}
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
