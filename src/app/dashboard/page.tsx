import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Nav } from "@/components/landing/nav";
import { WeekView } from "@/components/dashboard/week-view";
import { CalEvent, fetchWeekEvents } from "@/lib/google-calendar";

// Never cache — we want a fresh calendar pull every time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  // Belt-and-suspenders: if for any reason there's no signed-in user, bounce
  // them back to the landing page.
  if (!session?.accessToken) {
    redirect("/");
  }

  let events: CalEvent[] = [];
  let error: string | null = null;
  try {
    events = await fetchWeekEvents(session.accessToken);
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't reach Google Calendar.";
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <WeekView
          events={events}
          error={error}
          userName={session.user?.name ?? null}
        />
      </main>
    </div>
  );
}
