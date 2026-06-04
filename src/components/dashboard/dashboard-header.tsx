import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";

import { CategoryFilter } from "@/components/dashboard/category-filter";
import { SearchTrigger } from "@/components/dashboard/search-palette";
import {
  addDays,
  addMonths,
  endOfWeek,
  isSameDay,
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

/**
 * Dashboard header — two-row layout:
 *   1. Eyebrow + big title + subline (subline drops to its own row on narrow
 *      screens via flex-wrap so the title never has to wrap mid-word).
 *   2. Toolbar with logical grouping: nav + view toggle on the left,
 *      utility actions (search, filter, syllabus) on the right, separated
 *      by a thin rule so the eye reads them as distinct clusters.
 */
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

  const today = new Date();
  const isOnToday =
    view === "month"
      ? anchor.getMonth() === today.getMonth() &&
        anchor.getFullYear() === today.getFullYear()
      : isSameDay(startOfWeek(anchor), startOfWeek(today));

  const subline = error
    ? "We couldn't reach your calendar."
    : eventCount === 0
      ? "Nothing scheduled."
      : `${eventCount} ${eventCount === 1 ? "event" : "events"} in view.`;

  return (
    <header className="mb-10">
      <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
        {userName ? `Hi, ${userName.split(" ")[0]} —` : "Your calendar"}
      </div>

      {/* TITLE ROW */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="font-display whitespace-nowrap text-5xl tracking-tight text-ink sm:text-6xl">
          {title}
        </h1>
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
          {subline}
        </p>
      </div>

      {/* TOOLBAR */}
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-rule/40 pt-4">
        {/* LEFT CLUSTER — calendar navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <NavGroup
            view={view}
            prev={prevAnchor}
            next={nextAnchor}
            isOnToday={isOnToday}
          />
          <ViewToggle view={view} anchor={anchor} />
        </div>

        {/* RIGHT CLUSTER — utility actions */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchTrigger />
          <CategoryFilter />
          <Link
            href="/dashboard/syllabus"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-cream shadow-[0_4px_12px_-4px_rgba(200,75,26,0.5)] transition-colors duration-200 hover:bg-accent/90"
          >
            <BookOpen className="size-3.5" />
            <span className="hidden sm:inline">Import syllabus</span>
            <span className="sm:hidden">Syllabus</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── toolbar pieces ─── */

function NavGroup({
  view,
  prev,
  next,
  isOnToday,
}: {
  view: DashboardView;
  prev: Date;
  next: Date;
  isOnToday: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-rule bg-surface p-1">
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(prev)}`}
        aria-label="Previous"
        className="inline-flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
      >
        <ChevronLeft className="size-4" />
      </Link>
      {isOnToday ? (
        <span
          aria-disabled
          className="inline-flex h-7 select-none items-center rounded-full px-3 text-sm font-medium text-muted"
        >
          Today
        </span>
      ) : (
        <Link
          href={`/dashboard?view=${view}`}
          className="inline-flex h-7 items-center rounded-full px-3 text-sm font-medium text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
        >
          Today
        </Link>
      )}
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(next)}`}
        aria-label="Next"
        className="inline-flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

function ViewToggle({ view, anchor }: { view: DashboardView; anchor: Date }) {
  const anchorStr = toAnchorString(anchor);
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-rule bg-surface p-1">
      <ToggleButton
        href={`/dashboard?view=list&anchor=${anchorStr}`}
        active={view === "list"}
        label="List"
        icon={<List className="size-3.5" />}
      />
      <ToggleButton
        href={`/dashboard?view=month&anchor=${anchorStr}`}
        active={view === "month"}
        label="Month"
        icon={<LayoutGrid className="size-3.5" />}
      />
    </div>
  );
}

function ToggleButton({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm font-medium text-cream shadow-[0_4px_12px_-4px_rgba(26,22,18,0.4)]"
          : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
      }
    >
      {icon}
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
