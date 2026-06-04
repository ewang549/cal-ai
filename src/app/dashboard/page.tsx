import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  DashboardHeader,
  DashboardView,
} from "@/components/dashboard/dashboard-header";
import { Assistant } from "@/components/dashboard/assistant";
import { CategoryProvider } from "@/components/dashboard/category-context";
import { DeadlineNudge } from "@/components/dashboard/deadline-nudge";
import { EmptyDashboard } from "@/components/dashboard/empty-state";
import { ErrorCard } from "@/components/dashboard/error-card";
import { MonthView } from "@/components/dashboard/month-view";
import { Nav } from "@/components/landing/nav";
import { SearchPalette } from "@/components/dashboard/search-palette";
import { WeekListView } from "@/components/dashboard/week-view";
import { findAtRiskDeadlines } from "@/lib/calendar-tools";
import {
  CalEvent,
  endOfMonthGrid,
  endOfWeek,
  fetchEventsForRange,
  fromAnchorString,
  startOfMonthGrid,
  startOfWeek,
} from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

type SP = { view?: string; anchor?: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await auth();
  if (!session?.accessToken) {
    redirect("/");
  }

  const sp = await searchParams;
  const view: DashboardView = sp.view === "month" ? "month" : "list";
  const anchor = sp.anchor ? fromAnchorString(sp.anchor) : new Date();

  const [rangeStart, rangeEnd] =
    view === "month"
      ? [startOfMonthGrid(anchor), endOfMonthGrid(anchor)]
      : [startOfWeek(anchor), endOfWeek(anchor)];

  let events: CalEvent[] = [];
  let error: string | null = null;
  try {
    events = await fetchEventsForRange(
      session.accessToken,
      rangeStart,
      rangeEnd,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't reach Google Calendar.";
  }

  // Independently fetch the next 60 days for two purposes:
  //   (a) the at-risk-deadline nudge (next 72h subset)
  //   (b) the Cmd+K search palette pool
  // One fetch, two uses.
  let searchPool: CalEvent[] = [];
  let atRisk: ReturnType<typeof findAtRiskDeadlines> = [];
  if (!error) {
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      searchPool = await fetchEventsForRange(
        session.accessToken,
        now,
        horizon,
      );
      atRisk = findAtRiskDeadlines(searchPool, 72);
    } catch {
      // best-effort; no banner / search if it fails
    }
  }

  // Detect a fresh user (no events anywhere in the near future) to show
  // the welcome card. Browsing an empty far-future month doesn't count.
  const today = new Date();
  const viewingCurrentPeriod =
    view === "month"
      ? anchor.getMonth() === today.getMonth() &&
        anchor.getFullYear() === today.getFullYear()
      : anchor.getTime() >= rangeStart.getTime() - 7 * 86400000 &&
        anchor.getTime() <= rangeEnd.getTime() + 7 * 86400000;
  const isFreshUser =
    !error && viewingCurrentPeriod && searchPool.length === 0;

  return (
    <CategoryProvider>
      <div className="min-h-screen bg-cream text-ink">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 pt-12 pb-40 sm:px-10 sm:pt-16">
          <DashboardHeader
            view={view}
            anchor={anchor}
            userName={session.user?.name ?? null}
            eventCount={events.length}
            error={error}
          />

          {!error && <DeadlineNudge deadlines={atRisk} />}

          {error ? (
            <ErrorCard error={error} />
          ) : isFreshUser ? (
            <EmptyDashboard userName={session.user?.name ?? null} />
          ) : view === "month" ? (
            <MonthView events={events} anchor={anchor} />
          ) : (
            <WeekListView events={events} error={null} anchor={anchor} />
          )}
        </main>

        {/* Persistent fine-print privacy disclosure. Subtle but always present. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-1.5 sm:pb-2">
          <div className="pointer-events-auto font-mono text-[9px] tracking-[0.18em] uppercase text-muted/60">
            Usage logged to improve scheduling ·{" "}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-ink"
            >
              Privacy
            </a>
          </div>
        </div>

        <SearchPalette pool={searchPool} />

        <Suspense fallback={null}>
          <Assistant />
        </Suspense>
      </div>
    </CategoryProvider>
  );
}
