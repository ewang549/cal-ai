import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  addDays,
  addMonths,
  endOfWeek,
  startOfWeek,
  toAnchorString,
} from "@/lib/google-calendar";

const monthYearFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const rangeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export type DashboardView = "list" | "month";

export function DashboardHeader({
  view,
  anchor,
  userName,
  eventCount,
  error,
}: {
  view: DashboardView;
  anchor: Date;
  userName: string | null;
  eventCount: number;
  error: string | null;
}) {
  const title =
    view === "month" ? formatMonth(anchor) : formatWeekRange(anchor);

  const prevAnchor =
    view === "month" ? addMonths(anchor, -1) : addDays(anchor, -7);
  const nextAnchor =
    view === "month" ? addMonths(anchor, 1) : addDays(anchor, 7);

  return (
    <header className="mb-10">
      <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
        {userName ? `Hi, ${userName.split(" ")[0]} —` : "Your calendar"}
      </div>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-tight text-ink sm:text-6xl">
            {title}
          </h1>
          <p className="mt-2 text-ink-soft">
            {error
              ? "We couldn't reach your calendar."
              : `${eventCount} ${eventCount === 1 ? "event" : "events"} in view.`}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <NavGroup view={view} prev={prevAnchor} next={nextAnchor} />
          <ViewToggle view={view} anchor={anchor} />
        </div>
      </div>
    </header>
  );
}

function NavGroup({
  view,
  prev,
  next,
}: {
  view: DashboardView;
  prev: Date;
  next: Date;
}) {
  const cls =
    "inline-flex items-center justify-center rounded-full border border-rule bg-surface text-sm font-medium text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink";
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(prev)}`}
        aria-label="Previous"
        className={`${cls} size-10`}
      >
        <ChevronLeft className="size-4" />
      </Link>
      <Link
        href={`/dashboard?view=${view}`}
        className={`${cls} h-10 px-4`}
      >
        Today
      </Link>
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(next)}`}
        aria-label="Next"
        className={`${cls} size-10`}
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function ViewToggle({ view, anchor }: { view: DashboardView; anchor: Date }) {
  const anchorStr = toAnchorString(anchor);
  return (
    <div className="inline-flex items-center rounded-full border border-rule bg-surface p-1">
      <ToggleButton
        href={`/dashboard?view=list&anchor=${anchorStr}`}
        active={view === "list"}
        label="List"
      />
      <ToggleButton
        href={`/dashboard?view=month&anchor=${anchorStr}`}
        active={view === "month"}
        label="Month"
      />
    </div>
  );
}

function ToggleButton({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-cream"
          : "rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      }
    >
      {label}
    </Link>
  );
}

function formatMonth(d: Date): string {
  return monthYearFmt.format(d);
}

function formatWeekRange(d: Date): string {
  const start = startOfWeek(d);
  const end = endOfWeek(d);
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  return `${rangeFmt.format(start)} – ${rangeFmt.format(last)}`;
}
