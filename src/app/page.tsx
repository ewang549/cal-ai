import {
  CalendarCheck2,
  ChevronRight,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { DemoCard } from "@/components/landing/demo-card";
import { EarlyAccessForm } from "@/components/landing/early-access-form";
import { Hero } from "@/components/landing/hero";
import { Integrations } from "@/components/landing/integrations";
import { Nav } from "@/components/landing/nav";
import { Vision } from "@/components/landing/vision";

export default async function Home() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Vision />
        <Features />
        <Integrations />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────── HOW IT WORKS ───────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Type",
    body: "Say it how you'd say it out loud. “dinner with mom Thursday 7” is enough.",
  },
  {
    n: "02",
    title: "Confirm",
    body: "Cal AI shows the parsed event and waits for your okay before writing anything.",
  },
  {
    n: "03",
    title: "Done",
    body: "Approved events land on your real Google Calendar in under a second.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-rule/40">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-24">
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-left">
            <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
              How it works
            </div>
            <h2 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Three steps.{" "}
              <span className="italic text-accent">No magic.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-ink-soft lg:text-right">
            The LLM parses; your code validates. You always see what&apos;s about to
            happen before it does.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className="group relative flex flex-col gap-3 bg-cream p-8 transition-colors duration-300 hover:bg-surface sm:p-10"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted">
                  Step
                </span>
                <span className="font-display text-5xl italic text-accent/80">
                  {step.n}
                </span>
              </div>
              <h3 className="font-display mt-4 text-3xl tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">
                {step.body}
              </p>
              {i < STEPS.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="absolute right-3 top-1/2 hidden size-5 -translate-y-1/2 text-rule sm:block"
                />
              )}
            </li>
          ))}
        </ol>

        {/* live demo — the visual proof for the 3-step process above */}
        <div className="mt-20">
          <div className="mb-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-muted">
            <span className="inline-block size-1 rounded-full bg-accent" />
            Live demo
          </div>
          <DemoCard />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURES (BENTO) ───────────────────────── */

function Features() {
  return (
    <section id="features" className="relative border-t border-rule/40">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-24">
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-left">
            <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
              What you get
            </div>
            <h2 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A calendar that{" "}
              <span className="italic text-accent">listens.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-ink-soft lg:text-right">
            Built around a single idea: the calendar should adapt to how you think,
            not the other way around.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2">
          <FeatureCell
            Icon={MessageSquareText}
            title="Plain English in"
            body="Type the way you'd say it out loud. No dropdowns, no form fields, no fighting the picker."
            visual={<MockChat />}
          />
          <FeatureCell
            Icon={Sparkles}
            title="Validated by Claude"
            body="Every parse is checked against a strict schema. The model never writes to your calendar directly."
            visual={<MockJson />}
          />
          <FeatureCell
            Icon={CalendarCheck2}
            title="Google Calendar native"
            body="Sign in once. Events sync both ways with the calendar you already use, on every device."
            visual={<MockEvent />}
          />
          <FeatureCell
            Icon={ShieldCheck}
            title="Confirms before booking"
            body="No silent writes, no guessing. You see the parsed event and approve it before anything ships."
            visual={<MockConfirm />}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCell({
  Icon,
  title,
  body,
  visual,
}: {
  Icon: typeof Sparkles;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="group relative flex h-full flex-col bg-cream p-8 transition-colors duration-300 hover:bg-surface sm:p-10">
      <div className="flex size-11 items-center justify-center rounded-xl bg-ink text-cream transition-transform duration-300 group-hover:-rotate-6">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="font-display mt-6 text-2xl tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
        {body}
      </p>
      {/* fixed-height visual area so all four cells align cleanly */}
      <div className="mt-auto flex h-36 items-end pt-7">{visual}</div>
    </div>
  );
}

function MockChat() {
  const lines = [
    "lunch with sam thursday 1",
    "block 9–11 tomorrow to write",
    "move my 3pm to friday",
  ];
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line) => (
        <div
          key={line}
          className="self-start rounded-2xl rounded-bl-md bg-ink/5 px-3.5 py-2 font-mono text-[12px] text-ink-soft"
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function MockJson() {
  return (
    <pre className="overflow-x-auto rounded-xl bg-ink-deep p-3.5 font-mono text-[11.5px] leading-relaxed text-cream/90">
      <span className="text-cream/40">{"{"}</span>
      {"\n  "}
      <span className="text-accent-soft">&quot;title&quot;</span>
      <span className="text-cream/40">:</span> &quot;Dentist&quot;,
      {"\n  "}
      <span className="text-accent-soft">&quot;start&quot;</span>
      <span className="text-cream/40">:</span> &quot;2026-06-09T15:00&quot;,
      {"\n  "}
      <span className="text-accent-soft">&quot;end&quot;</span>
      <span className="text-cream/40">:</span> &quot;2026-06-09T16:00&quot;
      {"\n"}
      <span className="text-cream/40">{"}"}</span>
    </pre>
  );
}

function MockEvent() {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-rule bg-surface">
      <div className="w-1 bg-accent" />
      <div className="flex flex-1 items-center gap-3 px-3.5 py-3">
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
          Tue · Jun 9
        </div>
        <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          Dentist
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
          3:00 PM
        </div>
      </div>
    </div>
  );
}

function MockConfirm() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-cream"
      >
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Confirm &amp; add
      </button>
      <button
        type="button"
        disabled
        className="inline-flex items-center rounded-full border border-rule bg-surface px-3.5 py-2 text-xs font-medium text-ink-soft"
      >
        Edit
      </button>
      <button
        type="button"
        disabled
        className="inline-flex items-center rounded-full border border-rule bg-surface px-3.5 py-2 text-xs font-medium text-muted"
      >
        Cancel
      </button>
    </div>
  );
}

/* ───────────────────────── FINAL CTA ───────────────────────── */

function FinalCTA() {
  return (
    <section
      id="access"
      className="relative isolate overflow-hidden border-t border-rule/40 bg-ink-deep text-cream"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(200,75,26,0.35), transparent 45%), radial-gradient(circle at 85% 75%, rgba(224,138,90,0.18), transparent 50%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 sm:px-10 sm:py-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="text-left">
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent-soft">
            Early access
          </div>
          <h2 className="font-display mt-4 text-4xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Stop scheduling
            <br />
            like{" "}
            <span className="italic text-accent-soft">it&apos;s 2010.</span>
          </h2>
          <p className="mt-7 max-w-md text-base leading-relaxed text-cream/70 sm:text-lg">
            Request an invite. We&apos;re onboarding the first wave now — free
            during early access, no credit card.
          </p>
        </div>

        <div className="flex flex-col items-start lg:items-end">
          <EarlyAccessForm />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FOOTER ───────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-rule/40 bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-2 font-mono text-sm tracking-[0.18em] uppercase">
          <span className="inline-block size-1.5 rounded-full bg-accent" />
          <span className="font-medium text-ink">Cal&nbsp;AI</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] tracking-wider uppercase text-muted">
          <a href="#" className="transition-colors duration-200 hover:text-ink">
            Privacy
          </a>
          <a href="#" className="transition-colors duration-200 hover:text-ink">
            Terms
          </a>
          <a href="#" className="transition-colors duration-200 hover:text-ink">
            Contact
          </a>
        </div>

        <div className="font-mono text-[11px] tracking-wider uppercase text-muted">
          © 2026 Cal AI
        </div>
      </div>
    </footer>
  );
}
