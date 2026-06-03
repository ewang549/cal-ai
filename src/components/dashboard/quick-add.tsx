"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, MessageCircleQuestion, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ParsedEvent } from "@/lib/event-schema";

type State =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "clarifying"; question: string; originalText: string }
  | { kind: "confirming"; event: ParsedEvent }
  | { kind: "creating"; event: ParsedEvent }
  | { kind: "success"; title: string }
  | { kind: "error"; message: string };

type ParseResponse =
  | { type: "event"; event: ParsedEvent }
  | { type: "needs_clarification"; question: string; missing?: string[] };

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function QuickAdd() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [clarification, setClarification] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const clarifyInputRef = useRef<HTMLInputElement>(null);

  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  // auto-focus the clarification input when it appears
  useEffect(() => {
    if (state.kind === "clarifying") {
      clarifyInputRef.current?.focus();
    }
  }, [state.kind]);

  async function parseText(textToParse: string) {
    setState({ kind: "parsing" });
    try {
      const res = await fetch("/api/events/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToParse, timezone: tz }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Parse failed (${res.status})`);
      }
      const data = (await res.json()) as ParseResponse;
      if (data.type === "needs_clarification") {
        setState({
          kind: "clarifying",
          question: data.question,
          originalText: textToParse,
        });
        setClarification("");
      } else {
        setState({ kind: "confirming", event: data.event });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Parse failed",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || state.kind !== "idle") return;
    await parseText(text);
  }

  async function handleClarify(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "clarifying" || !clarification.trim()) return;
    const combined = `${state.originalText} — ${clarification.trim()}`;
    await parseText(combined);
  }

  async function handleConfirm(event: ParsedEvent) {
    setState({ kind: "creating", event });
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, timezone: tz }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create failed (${res.status})`);
      }
      setState({ kind: "success", title: event.title });
      setText("");
      setClarification("");
      router.refresh();
      setTimeout(() => setState({ kind: "idle" }), 2400);
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Create failed",
      });
    }
  }

  function resetToIdle() {
    setState({ kind: "idle" });
    setClarification("");
  }

  const isFormBusy =
    state.kind !== "idle" &&
    state.kind !== "error" &&
    state.kind !== "clarifying";

  return (
    <section className="mb-12 rounded-2xl border border-rule bg-surface p-5 shadow-[0_20px_60px_-30px_rgba(26,22,18,0.18)] sm:p-6">
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
        <Sparkles className="size-3.5 text-accent" />
        Add by typing
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isFormBusy || state.kind === "clarifying"}
          placeholder="dentist next Tuesday 3pm for an hour"
          aria-label="Describe an event in plain English"
          className="h-12 flex-1 rounded-xl border border-rule bg-cream px-4 text-[15px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-accent disabled:opacity-60"
        />
        <Button
          type="submit"
          size="lg"
          disabled={
            !text.trim() ||
            isFormBusy ||
            state.kind === "clarifying"
          }
          className="group"
        >
          {state.kind === "parsing" ? "Parsing…" : "Add event"}
          {state.kind !== "parsing" && (
            <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </Button>
      </form>

      {state.kind === "clarifying" && (
        <ClarifyCard
          question={state.question}
          originalText={state.originalText}
          value={clarification}
          onChange={setClarification}
          onSubmit={handleClarify}
          onCancel={resetToIdle}
          inputRef={clarifyInputRef}
        />
      )}

      {state.kind === "confirming" && (
        <ConfirmCard
          event={state.event}
          busy={false}
          onConfirm={() => handleConfirm(state.event)}
          onCancel={resetToIdle}
        />
      )}
      {state.kind === "creating" && (
        <ConfirmCard
          event={state.event}
          busy={true}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )}
      {state.kind === "success" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-rule bg-cream px-4 py-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-cream">
            <Check className="size-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-[15px] text-ink">
            Added <span className="font-medium">{state.title}</span> to your
            calendar.
          </div>
        </div>
      )}
      {state.kind === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rule bg-cream px-4 py-3">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-cream">
            <X className="size-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-[14px] text-ink-soft">
            {state.message}
          </div>
          <button
            type="button"
            onClick={resetToIdle}
            className="font-mono text-[11px] tracking-wider uppercase text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
}

function ClarifyCard({
  question,
  originalText,
  value,
  onChange,
  onSubmit,
  onCancel,
  inputRef,
}: {
  question: string;
  originalText: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-rule bg-cream">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          <MessageCircleQuestion className="size-3.5" />
          One more thing
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
          Quick clarify
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="mb-1 font-mono text-[11px] tracking-wider uppercase text-muted">
          You typed
        </div>
        <div className="font-mono text-sm text-ink-soft">
          &ldquo;{originalText}&rdquo;
        </div>
        <div className="font-display mt-4 text-lg italic text-ink">
          {question}
        </div>
        <form
          onSubmit={onSubmit}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 3pm"
            className="h-11 flex-1 rounded-xl border border-rule bg-surface px-4 text-[15px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-accent"
            aria-label="Clarification answer"
          />
          <Button type="submit" size="default" disabled={!value.trim()}>
            Try again
          </Button>
          <Button
            type="button"
            size="default"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}

function ConfirmCard({
  event,
  busy,
  onConfirm,
  onCancel,
}: {
  event: ParsedEvent;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-rule bg-cream">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          Here&apos;s what I understood
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
          Confirm to add
        </div>
      </div>

      <div className="flex items-stretch">
        <div className="w-1.5 bg-accent" />
        <div className="flex flex-1 flex-col gap-2 px-5 py-4">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
            {dayFmt.format(start)}
          </div>
          <div className="font-display text-2xl tracking-tight text-ink">
            {event.title}
          </div>
          <div className="font-mono text-xs text-ink-soft">
            {timeFmt.format(start)} – {timeFmt.format(end)}
          </div>
          {event.location && (
            <div className="text-sm text-ink-soft">📍 {event.location}</div>
          )}
          {event.description && (
            <div className="text-sm leading-relaxed text-ink-soft">
              {event.description}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-surface px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onConfirm} disabled={busy}>
          {busy ? (
            "Adding…"
          ) : (
            <>
              <Check className="mr-1.5 size-3.5" strokeWidth={2.25} />
              Confirm &amp; add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
