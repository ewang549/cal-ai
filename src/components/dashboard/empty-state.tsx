import Link from "next/link";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";

/**
 * Welcome / get-started card. Shown on the dashboard when the visible
 * week or month has zero events AND the user is on the current period
 * (i.e. they're not just browsing an empty future month).
 */
export function EmptyDashboard({ userName }: { userName: string | null }) {
  const first = userName?.split(" ")[0] ?? "there";

  return (
    <section className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_30px_80px_-40px_rgba(26,22,18,0.2)]">
      <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-[1.1fr_1fr]">
        {/* Left panel — pitch */}
        <div className="bg-surface p-8 sm:p-10">
          <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
            Welcome, {first}
          </div>
          <h2 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Your calendar is{" "}
            <span className="italic text-accent">empty.</span>{" "}
            Let&apos;s fix that.
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
            Two fastest ways to get started — pick whichever feels right.
          </p>
        </div>

        {/* Right panel — two CTAs stacked */}
        <div className="flex flex-col gap-px bg-rule">
          <CTACard
            href="/dashboard/syllabus"
            eyebrow="Recommended"
            title="Drop a syllabus PDF"
            body="Cal AI extracts every class, exam, and assignment date — your whole semester on the calendar in under a minute."
            Icon={BookOpen}
            primary
          />
          <CTACard
            href="/dashboard?prompt=Plan%20my%20Tuesday"
            eyebrow="Or chat"
            title="Just talk to Cal AI"
            body="Type what you'd say out loud — “lunch with Sam Thursday 1” — Cal AI parses, confirms, and adds it."
            Icon={Sparkles}
          />
        </div>
      </div>
    </section>
  );
}

function CTACard({
  href,
  eyebrow,
  title,
  body,
  Icon,
  primary = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  Icon: typeof BookOpen;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-1 flex-col gap-3 bg-surface p-6 transition-colors duration-200 hover:bg-cream-deep/40 sm:p-7 ${
        primary ? "" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          {eyebrow}
        </span>
        <ArrowUpRight className="size-4 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-cream">
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <div className="font-display text-xl tracking-tight text-ink">
            {title}
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
            {body}
          </p>
        </div>
      </div>
    </Link>
  );
}
