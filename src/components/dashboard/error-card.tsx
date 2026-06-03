import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function ErrorCard({ error }: { error: string }) {
  const isScopeIssue =
    error.includes("403") || /scope|permission/i.test(error);

  return (
    <div className="rounded-2xl border border-rule bg-surface px-6 py-10 sm:px-10">
      <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
        {isScopeIssue
          ? "Calendar permission missing."
          : "Couldn't reach your calendar."}
      </h2>

      {isScopeIssue ? (
        <>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
            Google didn&apos;t grant the calendar scope on sign-in — usually
            because of a stale permission from a previous test. Quick fix:
          </p>
          <ol className="mt-5 max-w-prose list-decimal space-y-2 pl-5 text-[15px] text-ink-soft">
            <li>
              Open{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4"
              >
                your Google account permissions
              </a>
              .
            </li>
            <li>
              Find <strong>Cal AI Assistant</strong> and click{" "}
              <strong>Remove access</strong>.
            </li>
            <li>
              Come back and click <strong>Sign out &amp; try again</strong> —
              the full consent screen including calendar will appear.
            </li>
          </ol>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-7"
          >
            <Button type="submit" size="lg">
              Sign out &amp; try again
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
            Something went wrong fetching events. The raw error is below.
          </p>
          <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-ink-deep p-4 font-mono text-xs text-cream">
            {error}
          </pre>
        </>
      )}
    </div>
  );
}
