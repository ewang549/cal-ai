import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Nav } from "@/components/landing/nav";
import { SyllabusClient } from "@/components/dashboard/syllabus-client";

/**
 * Server component. Handles the auth gate and renders the shared Nav,
 * then defers all the interactive upload / preview / import logic to
 * <SyllabusClient />. Splitting this way is required because Nav is an
 * async server component that calls `auth()`, and client components
 * can't render async server components.
 */
export default async function SyllabusPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <SyllabusClient />
      </main>
    </div>
  );
}
