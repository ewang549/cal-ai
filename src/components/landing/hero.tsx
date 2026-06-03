"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { BackgroundPaths } from "@/components/ui/background-paths";

/**
 * Hero — full-viewport, dramatic centered headline, vertical grid divider
 * overlay, custom split CTA with arrow slide animation. Adapted from the
 * "aero-hero-3" pattern, retuned to our cream/ink/terracotta palette.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-72px)] w-full items-center justify-center overflow-hidden">
      <BackgroundPaths />

      {/* warm focal gradient pulling attention to center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(200,75,26,0.07), transparent 70%)",
        }}
      />

      {/* vertical column dividers */}
      <div aria-hidden className="absolute inset-0 z-10">
        <div className="grid h-full w-full grid-cols-12 divide-x divide-rule/40">
          <div className="col-span-1" />
          <div className="col-span-3" />
          <div className="col-span-4" />
          <div className="col-span-3" />
          <div className="col-span-1" />
        </div>
      </div>

      {/* content */}
      <div className="relative z-20 mx-auto max-w-5xl px-6 text-center sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
          className="mx-auto mb-10 inline-flex items-center gap-2.5 rounded-full border border-rule bg-surface/80 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-soft backdrop-blur"
        >
          <span className="relative inline-flex">
            <span className="inline-block size-1.5 rounded-full bg-accent" />
            <span className="absolute inset-0 inline-block size-1.5 animate-ping rounded-full bg-accent opacity-60" />
          </span>
          Early access — request an invite
        </motion.div>

        <h1 className="font-display text-[3.5rem] leading-[0.92] tracking-tight text-ink sm:text-7xl md:text-[7.5rem] lg:text-[8.5rem]">
          <RevealWords>Schedule in</RevealWords>
          <br />
          <RevealWords delayBase={0.25} className="italic text-accent">
            plain English.
          </RevealWords>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95, ease: [0.2, 0.7, 0.2, 1] }}
          className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg"
        >
          Cal AI parses your sentence with Claude, confirms what it understood,
          and writes the event to your Google Calendar in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.15, ease: [0.2, 0.7, 0.2, 1] }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6"
        >
          <SplitCTA href="#access" label="Get early access" />
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
          transition={{ duration: 1.2, delay: 1.45 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.18em] uppercase text-muted"
        >
          <span>Built on Claude</span>
          <span className="size-1 rounded-full bg-rule" />
          <span>Google Calendar native</span>
          <span className="size-1 rounded-full bg-rule" />
          <span>Privacy-first</span>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Custom split CTA. Two-part button: text pill + circular arrow pill.
 * On hover the arrow slides out to the right while a second arrow slides
 * in from the left — gives the button a kinetic personality.
 */
function SplitCTA({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="group inline-flex items-stretch gap-1.5"
    >
      <span className="inline-flex items-center rounded-full bg-ink px-6 text-sm font-medium text-cream shadow-[0_10px_30px_-15px_rgba(26,22,18,0.55)] transition-colors duration-500 group-hover:bg-accent">
        {label}
      </span>
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-cream shadow-[0_10px_30px_-15px_rgba(26,22,18,0.55)] transition-colors duration-500 group-hover:bg-accent">
        <ArrowUpRight className="absolute size-4 transition-transform duration-500 ease-out group-hover:translate-x-12" />
        <ArrowUpRight className="absolute size-4 -translate-x-12 transition-transform duration-500 ease-out group-hover:translate-x-0" />
      </span>
    </a>
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
                delay: delayBase + wi * 0.05 + ci * 0.022,
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
