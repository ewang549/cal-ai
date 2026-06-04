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

      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-tight text-ink sm:text-6xl">
            {title}
          </h1>
          <p className="mt-2 text-ink-soft">{subline}</p>
        </div>

        <div className="flex flex-wrap items-stretch gap-2 sm:flex-row sm:items-center">
          <SearchTrigger />
          <CategoryFilter />
          <Link
            href="/dashboard/syllabus"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/[0.06] px-3.5 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent/[0.12]"
          >
            <BookOpen className="size-3.5" />
            <span className="hidden sm:inline">Import syllabus</span>
            <span className="sm:hidden">Syllabus</span>
          </Link>
          <NavGroup
            view={view}
            prev={prevAnchor}
            next={nextAnchor}
            isOnToday={isOnToday}
          />
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
  isOnToday,
}: {
  view: DashboardView;
  prev: Date;
  next: Date;
  isOnToday: boolean;
}) {
  const iconBtn =
    "inline-flex size-10 items-center justify-center rounded-full border border-rule bg-surface text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink";
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(prev)}`}
        aria-label="Previous"
        className={iconBtn}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {isOnToday ? (
        <span
          aria-disabled
          className="inline-flex h-10 select-none items-center rounded-full border border-rule/60 bg-surface/50 px-4 text-sm font-medium text-muted"
        >
          Today
        </span>
      ) : (
        <Link
          href={`/dashboard?view=${view}`}
          className="inline-flex h-10 items-center rounded-full border border-rule bg-surface px-4 text-sm font-medium text-ink-soft transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
        >
          Today
        </Link>
      )}
      <Link
        href={`/dashboard?view=${view}&anchor=${toAnchorString(next)}`}
        aria-label="Next"
        className={iconBtn}
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
          ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream shadow-[0_4px_12px_-4px_rgba(26,22,18,0.4)]"
          : "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
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
