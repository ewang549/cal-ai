export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cream text-ink">
      {/* faint vertical rules — editorial column markers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <div className="flex h-full w-[80rem] max-w-[90vw] justify-between">
          <span className="block h-full w-px bg-rule/60" />
          <span className="block h-full w-px bg-rule/40" />
          <span className="block h-full w-px bg-rule/40" />
          <span className="block h-full w-px bg-rule/60" />
        </div>
      </div>

      {/* top bar */}
      <header
        className="reveal relative z-10 flex items-center justify-between px-6 pt-6 text-xs tracking-[0.18em] uppercase sm:px-10 lg:px-16"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center gap-2.5 font-mono">
          <span className="inline-block size-1.5 rounded-full bg-accent" />
          <span className="font-medium">Cal&nbsp;AI</span>
          <span className="text-muted">/ 001</span>
        </div>
        <div className="hidden font-mono text-muted sm:block">
          A summer experiment · 2026
        </div>
        <a
          href="https://github.com/ewang549/cal-ai"
          className="font-mono text-muted underline-offset-4 transition hover:text-ink hover:underline"
        >
          GitHub →
        </a>
      </header>

      <div
        className="editorial-rule draw mx-6 mt-6 h-px sm:mx-10 lg:mx-16"
        style={{ animationDelay: "200ms" }}
      />

      {/* hero */}
      <main className="relative z-10 grid gap-16 px-6 pt-16 pb-24 sm:px-10 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-16 lg:pt-28">
        {/* left column — type */}
        <section className="flex flex-col">
          <div
            className="reveal mb-8 inline-flex w-fit items-center gap-3 rounded-full border border-rule bg-surface/70 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-soft backdrop-blur-sm"
            style={{ animationDelay: "300ms" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="pulse inline-block size-1.5 rounded-full bg-accent" />
              In&nbsp;development
            </span>
            <span className="text-rule">·</span>
            <span>Phase 0 — shipped</span>
          </div>

          <h1
            className="reveal font-display text-[3.5rem] leading-[0.98] tracking-tight text-ink sm:text-[5.5rem] lg:text-[6.25rem]"
            style={{ animationDelay: "450ms" }}
          >
            Your calendar,
            <br />
            <span className="italic text-accent">in plain</span>
            <br />
            <span className="italic text-accent">English.</span>
          </h1>

          <p
            className="reveal mt-10 max-w-md text-lg leading-[1.55] text-ink-soft"
            style={{ animationDelay: "650ms" }}
          >
            Cal AI plugs into Google Calendar and lets you create, move, and rearrange
            events by typing the way you actually think — not the way a form wants you
            to.
          </p>

          {/* CTA + footnote */}
          <div
            className="reveal mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "850ms" }}
          >
            <button
              type="button"
              disabled
              className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-ink px-5 text-sm font-medium text-cream shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_24px_-12px_rgba(26,22,18,0.5)] transition hover:bg-ink-deep disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-block size-4 rounded-full border border-cream/30 bg-cream/10" />
              Continue with Google
              <span className="ml-1 font-mono text-[10px] tracking-wider uppercase opacity-60">
                soon
              </span>
            </button>
            <span className="font-mono text-xs tracking-wider uppercase text-muted">
              ↳ Phase 1
            </span>
          </div>

          {/* signature row */}
          <div
            className="reveal mt-16 flex items-center gap-4 font-mono text-xs tracking-wider uppercase text-muted"
            style={{ animationDelay: "1050ms" }}
          >
            <span>Built by</span>
            <span className="text-ink">Ethan Wang</span>
            <span className="h-px w-8 bg-rule" />
            <span>Stack: Next.js · Claude · Google Calendar</span>
          </div>
        </section>

        {/* right column — live demo card */}
        <section className="lg:pt-2">
          <div
            className="reveal relative"
            style={{ animationDelay: "750ms" }}
          >
            {/* annotation arrow */}
            <div className="absolute -top-7 left-0 flex items-center gap-2 font-display text-sm italic text-muted sm:-top-8">
              <span className="text-base">↳</span>
              <span>the part the LLM does</span>
            </div>

            <article className="relative overflow-hidden rounded-2xl border border-rule bg-ink-deep text-cream shadow-[0_30px_80px_-30px_rgba(26,22,18,0.45)]">
              {/* card chrome */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f56]/80" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e]/80" />
                  <span className="size-2.5 rounded-full bg-[#27c93f]/80" />
                </div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-cream/40">
                  cal-ai · live
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-cream/40">
                  <span className="pulse inline-block size-1.5 rounded-full bg-emerald-400" />
                  ready
                </div>
              </div>

              {/* input row */}
              <div className="px-6 pt-7 pb-5 font-mono text-sm">
                <div className="mb-2 text-[10px] tracking-[0.18em] uppercase text-cream/40">
                  You type
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-accent-soft">›</span>
                  <span className="caret">
                    <span
                      className="typing text-cream"
                      style={{ animationDelay: "1400ms" }}
                    >
                      dentist next Tuesday at 3 for an hour
                    </span>
                  </span>
                </div>
              </div>

              {/* thinking */}
              <div
                className="fade flex items-center gap-2 px-6 pb-4 font-mono text-[11px] tracking-wider uppercase text-cream/40"
                style={{ animationDelay: "3500ms" }}
              >
                <span className="pulse inline-block size-1 rounded-full bg-accent-soft" />
                <span>Claude parsing…</span>
              </div>

              {/* parsed JSON */}
              <div
                className="fade mx-5 mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-relaxed"
                style={{ animationDelay: "4200ms" }}
              >
                <div className="mb-2 text-[10px] tracking-[0.18em] uppercase text-cream/40">
                  Claude returns
                </div>
                <pre className="overflow-x-auto text-cream/90">
                  <span className="text-cream/40">{"{"}</span>
                  {"\n  "}
                  <span className="text-accent-soft">&quot;title&quot;</span>
                  <span className="text-cream/40">: </span>
                  <span className="text-cream">&quot;Dentist&quot;</span>
                  <span className="text-cream/40">,</span>
                  {"\n  "}
                  <span className="text-accent-soft">&quot;start&quot;</span>
                  <span className="text-cream/40">: </span>
                  <span className="text-cream">&quot;2026-06-09T15:00&quot;</span>
                  <span className="text-cream/40">,</span>
                  {"\n  "}
                  <span className="text-accent-soft">&quot;end&quot;</span>
                  <span className="text-cream/40">: </span>
                  <span className="text-cream">&quot;2026-06-09T16:00&quot;</span>
                  {"\n"}
                  <span className="text-cream/40">{"}"}</span>
                </pre>
              </div>

              {/* event card preview */}
              <div
                className="fade mx-5 mb-6 overflow-hidden rounded-lg bg-cream text-ink"
                style={{ animationDelay: "5200ms" }}
              >
                <div className="flex items-stretch">
                  <div className="w-1.5 bg-accent" />
                  <div className="flex-1 px-4 py-3.5">
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                      Tue · Jun 9
                    </div>
                    <div className="mt-0.5 text-base font-medium">Dentist</div>
                    <div className="font-mono text-xs text-ink-soft">
                      3:00 PM – 4:00 PM
                    </div>
                  </div>
                  <div className="flex items-center pr-4 font-mono text-[10px] tracking-wider uppercase text-muted">
                    ✓ written to&nbsp;calendar
                  </div>
                </div>
              </div>
            </article>

            {/* below card caption */}
            <div className="mt-4 flex items-start gap-2 font-mono text-[11px] tracking-wider uppercase text-muted">
              <span>★</span>
              <span>
                Output is JSON-validated before anything touches your real calendar.
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* below-fold roadmap strip */}
      <section
        className="reveal relative z-10 border-t border-rule/70 bg-cream-deep/50"
        style={{ animationDelay: "1200ms" }}
      >
        <div className="mx-auto grid max-w-[80rem] gap-6 px-6 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-5 lg:px-16">
          {[
            { phase: "00", title: "Scaffold + deploy", state: "done" },
            { phase: "01", title: "Google login & read", state: "next" },
            { phase: "02", title: "Full event CRUD", state: "later" },
            { phase: "03", title: "Natural-language input", state: "later" },
            { phase: "04", title: "Day planner (stretch)", state: "later" },
          ].map((p) => (
            <div key={p.phase} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
                <span>Phase {p.phase}</span>
                {p.state === "done" && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-cream">
                    shipped
                  </span>
                )}
                {p.state === "next" && (
                  <span className="rounded-full border border-accent px-2 py-0.5 text-accent">
                    up next
                  </span>
                )}
              </div>
              <div
                className={
                  p.state === "later"
                    ? "font-display text-xl italic text-muted"
                    : "font-display text-xl italic text-ink"
                }
              >
                {p.title}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-rule/70 px-6 py-6 font-mono text-[11px] tracking-wider uppercase text-muted sm:px-10 lg:px-16">
        <span>© 2026 Ethan Wang</span>
        <span className="text-ink-soft">Designed and built in public.</span>
        <a
          href="https://github.com/ewang549/cal-ai"
          className="underline-offset-4 hover:text-ink hover:underline"
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
