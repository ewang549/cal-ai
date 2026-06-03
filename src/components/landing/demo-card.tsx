/**
 * Interactive-looking demo: input → Claude-parsed JSON → real event card.
 * Animations are CSS-only (defined in globals.css) so this stays a server
 * component and ships zero JS.
 */
export function DemoCard() {
  return (
    <article className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-rule bg-ink-deep text-cream shadow-[0_40px_100px_-30px_rgba(26,22,18,0.45)]">
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
      <div className="px-6 pt-7 pb-5 font-mono text-sm sm:text-[15px]">
        <div className="mb-2 text-[10px] tracking-[0.18em] uppercase text-cream/40">
          You type
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-accent-soft">›</span>
          <span className="caret">
            <span
              className="typing text-cream"
              style={{ animationDelay: "400ms" }}
            >
              dentist next Tuesday at 3 for an hour
            </span>
          </span>
        </div>
      </div>

      {/* thinking */}
      <div
        className="fade flex items-center gap-2 px-6 pb-4 font-mono text-[11px] tracking-wider uppercase text-cream/40"
        style={{ animationDelay: "2500ms" }}
      >
        <span className="pulse inline-block size-1 rounded-full bg-accent-soft" />
        <span>Claude parsing…</span>
      </div>

      {/* parsed JSON */}
      <div
        className="fade mx-5 mb-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-relaxed"
        style={{ animationDelay: "3200ms" }}
      >
        <div className="mb-2 text-[10px] tracking-[0.18em] uppercase text-cream/40">
          Validated JSON
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
        style={{ animationDelay: "4200ms" }}
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
          <div className="hidden items-center pr-4 font-mono text-[10px] tracking-wider uppercase text-muted sm:flex">
            ✓ on your calendar
          </div>
        </div>
      </div>
    </article>
  );
}
