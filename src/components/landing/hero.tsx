"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <BackgroundPaths />

      {/* soft top wash to anchor nav contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cream to-transparent"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-rule bg-surface/80 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-soft backdrop-blur"
        >
          <span className="relative inline-flex">
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            <span className="absolute inset-0 inline-block size-1.5 animate-ping rounded-full bg-accent opacity-60" />
          </span>
          Early access — request an invite
        </motion.div>

        <h1 className="font-display text-[2.75rem] leading-[1] tracking-tight text-ink sm:text-6xl lg:text-[5.5rem]">
          <RevealWords>Cal AI turns sentences</RevealWords>
          <br />
          <RevealWords delayBase={0.35}>into calendar events.</RevealWords>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-8 max-w-2xl text-lg leading-[1.55] text-ink-soft sm:text-xl"
        >
          Type the way you&apos;d say it out loud. Cal AI parses it with Claude,
          confirms what it understood, and writes the event to your Google Calendar
          in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.15, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-11 flex flex-col items-center gap-5 sm:flex-row"
        >
          <Button size="lg" className="group" asChild>
            <a href="#access">
              Get early access
              <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </Button>
          <a
            href="#how"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 transition-colors duration-200 hover:text-ink"
          >
            See how it works
            <span className="transition-transform duration-200 group-hover:translate-y-0.5">
              ↓
            </span>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.5 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.18em] uppercase text-muted"
        >
          <span>Built on Claude</span>
          <span className="size-1 rounded-full bg-rule" />
          <span>Reads &amp; writes Google Calendar</span>
          <span className="size-1 rounded-full bg-rule" />
          <span>Privacy-first by default</span>
        </motion.div>
      </div>
    </section>
  );
}

function RevealWords({
  children,
  delayBase = 0,
  className = "",
}: {
  children: string;
  delayBase?: number;
  className?: string;
}) {
  const words = children.split(" ");
  return (
    <span className={className}>
      {words.map((word, wi) => (
        <span key={wi} className="mr-3 inline-block whitespace-nowrap last:mr-0">
          {word.split("").map((char, ci) => (
            <motion.span
              key={`${wi}-${ci}`}
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: delayBase + wi * 0.06 + ci * 0.025,
                type: "spring",
                stiffness: 180,
                damping: 22,
              }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}
