import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  DashboardHeader,
  DashboardView,
} from "@/components/dashboard/dashboard-header";
import { Assistant } from "@/components/dashboard/assistant";
import { DeadlineNudge } from "@/components/dashboard/deadline-nudge";
import { ErrorCard } from "@/components/dashboard/error-card";
import { MonthView } from "@/components/dashboard/month-view";
import { Nav } from "@/components/landing/nav";
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

  // Independently fetch the next 72h to detect at-risk deadlines, regardless
  // of which view the user is on. (View range might not include today.)
  let atRisk: ReturnType<typeof findAtRiskDeadlines> = [];
  if (!error) {
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const nearby = await fetchEventsForRange(
        session.accessToken,
        now,
        horizon,
      );
      atRisk = findAtRiskDeadlines(nearby, 72);
    } catch {
      // best-effort; no banner if it fails
    }
  }

  return (
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
        ) : view === "month" ? (
          <MonthView events={events} anchor={anchor} />
        ) : (
          <WeekListView events={events} error={null} anchor={anchor} />
        )}
      </main>

      {/* Conversational assistant pinned to the bottom of the viewport.
          Wrapped in Suspense because it reads URL search params (?prompt=…). */}
      <Suspense fallback={null}>
        <Assistant />
      </Suspense>
    </div>
  );
}
