import { ArrowRight, LogOut } from "lucide-react";

import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

/**
 * Top nav. Async server component — calls `auth()` to check whether the
 * user is signed in, and renders different right-hand controls accordingly.
 *
 * Sign-in / sign-out happen via server actions (the inline `"use server"`
 * functions on each form). This is the canonical Auth.js v5 pattern: no
 * client JS required for the auth controls themselves.
 */
export async function Nav() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-50 border-b border-rule/40 bg-cream/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <a
          href="/"
          className="group flex items-center gap-2 font-mono text-sm tracking-[0.18em] uppercase"
        >
          <span className="inline-block size-1.5 rounded-full bg-accent transition-transform duration-200 group-hover:scale-125" />
          <span className="font-medium text-ink">Cal&nbsp;AI</span>
        </a>

        {!isSignedIn && (
          <nav className="hidden items-center gap-8 text-sm text-ink-soft sm:flex">
            <a
              href="/#how"
              className="transition-colors duration-200 hover:text-ink"
            >
              How it works
            </a>
            <a
              href="/#features"
              className="transition-colors duration-200 hover:text-ink"
            >
              Features
            </a>
            <a
              href="/#access"
              className="transition-colors duration-200 hover:text-ink"
            >
              Early access
            </a>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <SignedInControls userEmail={session?.user?.email ?? null} />
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </header>
  );
}

function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      <Button size="sm" type="submit" className="group">
        Continue with Google
        <ArrowRight className="ml-1.5 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}

function SignedInControls({ userEmail }: { userEmail: string | null }) {
  return (
    <>
      <a
        href="/dashboard"
        className="hidden text-sm text-ink-soft transition-colors duration-200 hover:text-ink sm:inline"
      >
        Dashboard
      </a>
      {userEmail && (
        <span className="hidden font-mono text-[11px] tracking-wider text-muted md:inline">
          {userEmail}
        </span>
      )}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button
          size="sm"
          variant="outline"
          type="submit"
          className="group"
          aria-label="Sign out"
        >
          <LogOut className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span className="ml-1.5">Sign out</span>
        </Button>
      </form>
    </>
  );
}
