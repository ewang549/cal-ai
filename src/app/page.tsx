import {
  CalendarCheck2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DemoCard } from "@/components/landing/demo-card";
import { EarlyAccessForm } from "@/components/landing/early-access-form";
import { Hero } from "@/components/landing/hero";
import { Integrations } from "@/components/landing/integrations";
import { Vision } from "@/components/landing/vision";

export default function Home() {
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

/* ───────────────────────── NAV ───────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule/40 bg-cream/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <a
          href="#"
          className="group flex items-center gap-2 font-mono text-sm tracking-[0.18em] uppercase"
        >
          <span className="inline-block size-1.5 rounded-full bg-accent transition-transform duration-200 group-hover:scale-125" />
          <span className="font-medium text-ink">Cal&nbsp;AI</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-ink-soft sm:flex">
          <a
            href="#how"
            className="transition-colors duration-200 hover:text-ink"
          >
            How it works
          </a>
          <a
            href="#features"
            className="transition-colors duration-200 hover:text-ink"
          >
            Features
          </a>
          <a
            href="#access"
            className="transition-colors duration-200 hover:text-ink"
          >
            Early access
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#access"
            className="hidden text-sm text-ink-soft transition-colors duration-200 hover:text-ink sm:inline"
          >
            Sign in
          </a>
          <Button size="sm" asChild>
            <a href="#access">Get early access</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── HOW IT WORKS ───────────────────────── */

function HowItWorks() {
  return (
    <section
      id="how"
      className="relative border-t border-rule/40 bg-cream-deep/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
            How it works
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Type the way you think.{" "}
            <span className="italic text-accent">We&nbsp;do&nbsp;the&nbsp;rest.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Cal AI parses your sentence with Claude, validates the result against a
            strict schema, and shows you exactly what will happen — before anything
            touches your calendar.
          </p>
        </div>

        <div className="mt-16 sm:mt-20">
          <DemoCard />
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="flex flex-col items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-muted sm:flex-row sm:justify-between">
            <span>★ Validated before booking.</span>
            <span>★ Reversible with one click.</span>
            <span>★ Always shows what changed.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FEATURES ───────────────────────── */

const features = [
  {
    Icon: MessageSquareText,
    title: "Plain English in",
    body: "Type 'dinner with mom Thursday 7pm' the way you'd say it. No date pickers, no dropdowns.",
  },
  {
    Icon: Sparkles,
    title: "Validated by Claude",
    body: "Every parse is checked against a strict JSON schema. The model never writes to your calendar directly.",
  },
  {
    Icon: CalendarCheck2,
    title: "Native Google Calendar",
    body: "Sign in once. Events sync both ways with the calendar you already use, on every device.",
  },
  {
    Icon: ShieldCheck,
    title: "Confirms before booking",
    body: "Cal AI shows you the parsed event and waits for your okay before anything ships to your calendar.",
  },
];

function Features() {
  return (
    <section id="features" className="relative border-t border-rule/40">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
            What you get
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            A calendar that <span className="italic text-accent">listens.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2">
          {features.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 bg-cream p-8 transition-colors duration-300 hover:bg-surface sm:p-10"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-ink text-cream transition-transform duration-300 group-hover:-rotate-6">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-2xl tracking-tight text-ink">
                {title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
            "radial-gradient(circle at 20% 20%, rgba(200,75,26,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(224,138,90,0.18), transparent 50%)",
        }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:px-10 sm:py-32">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent-soft">
          Early access
        </div>
        <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Stop scheduling like
          <br />
          <span className="italic text-accent-soft">it&apos;s 2010.</span>
        </h2>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-cream/70">
          Request an invite. We&apos;re onboarding the first wave now — free during
          early access, no credit card needed.
        </p>

        <EarlyAccessForm />
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
          <a
            href="#"
            className="transition-colors duration-200 hover:text-ink"
          >
            Privacy
          </a>
          <a
            href="#"
            className="transition-colors duration-200 hover:text-ink"
          >
            Terms
          </a>
          <a
            href="#"
            className="transition-colors duration-200 hover:text-ink"
          >
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
