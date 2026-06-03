export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Work in progress
        </div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Your calendar, in plain English.
        </h1>

        <p className="mt-5 text-lg leading-7 text-zinc-600 dark:text-zinc-400">
          Cal AI connects to your Google Calendar and lets you create and rearrange
          events by typing the way you think — &ldquo;dentist next Tuesday at 3 for an
          hour.&rdquo;
        </p>

        <button
          type="button"
          disabled
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background opacity-60"
        >
          Continue with Google
          <span className="text-xs opacity-70">(coming soon)</span>
        </button>

        <p className="mt-12 text-xs text-zinc-500">
          Built by Ethan Wang ·{" "}
          <a
            href="https://github.com/ewang549/cal-ai"
            className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            GitHub
          </a>
        </p>
      </div>
    </main>
  );
}
