"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  MessageCircleQuestion,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  CreateAction,
  DeleteAction,
  ParseResponse,
  ParsedEvent,
  UpdateAction,
} from "@/lib/event-schema";

type Action = CreateAction | UpdateAction | DeleteAction;

type State =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "clarifying"; question: string; originalText: string }
  | { kind: "confirming"; action: Action }
  | { kind: "executing"; action: Action }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

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

  useEffect(() => {
    if (state.kind === "clarifying") clarifyInputRef.current?.focus();
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
      if (data.action === "clarify") {
        setState({
          kind: "clarifying",
          question: data.question,
          originalText: textToParse,
        });
        setClarification("");
      } else {
        setState({ kind: "confirming", action: data });
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

  async function handleConfirm(action: Action) {
    setState({ kind: "executing", action });
    try {
      const { endpoint, body, successMessage } = endpointFor(action, tz);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      setState({ kind: "success", message: successMessage });
      setText("");
      setClarification("");
      router.refresh();
      setTimeout(() => setState({ kind: "idle" }), 2400);
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed",
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
        Add · move · cancel — by typing
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
          placeholder="dentist next Tuesday 3pm   ·   move my 3pm to Friday   ·   cancel lunch Tuesday"
          aria-label="Describe what to do, in plain English"
          className="h-12 flex-1 rounded-xl border border-rule bg-cream px-4 text-[15px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-accent disabled:opacity-60"
        />
        <Button
          type="submit"
          size="lg"
          disabled={
            !text.trim() || isFormBusy || state.kind === "clarifying"
          }
          className="group"
        >
          {state.kind === "parsing" ? "Parsing…" : "Go"}
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

      {(state.kind === "confirming" || state.kind === "executing") && (
        <ActionCard
          action={state.action}
          busy={state.kind === "executing"}
          onConfirm={() => handleConfirm(state.action)}
          onCancel={resetToIdle}
        />
      )}

      {state.kind === "success" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-rule bg-cream px-4 py-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-cream">
            <Check className="size-4" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-[15px] text-ink">{state.message}</div>
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

function endpointFor(
  action: Action,
  tz: string,
): { endpoint: string; body: unknown; successMessage: string } {
  if (action.action === "create") {
    return {
      endpoint: "/api/events/create",
      body: { ...action.event, timezone: tz },
      successMessage: `Added “${action.event.title}” to your calendar.`,
    };
  }
  if (action.action === "update") {
    return {
      endpoint: "/api/events/update",
      body: {
        eventId: action.eventId,
        updates: action.updates,
        timezone: tz,
      },
      successMessage: `Updated “${action.eventTitle}”.`,
    };
  }
  // delete
  return {
    endpoint: "/api/events/delete",
    body: { eventId: action.eventId },
    successMessage: `Cancelled “${action.eventTitle}”.`,
  };
}

/* ─────────────────────── Cards ─────────────────────── */

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
          <Button type="button" size="default" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  action: Action;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (action.action === "create") {
    return (
      <CardShell
        eyebrow="Here's what I understood"
        rightLabel="Confirm to add"
        accent="add"
      >
        <EventBlock
          title={action.event.title}
          start={action.event.start}
          end={action.event.end}
          location={action.event.location ?? undefined}
          description={action.event.description ?? undefined}
        />
        <CardActions
          busy={busy}
          confirmLabel="Confirm & add"
          confirmIcon={<Check className="mr-1.5 size-3.5" strokeWidth={2.25} />}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </CardShell>
    );
  }

  if (action.action === "update") {
    const updates = action.updates;
    return (
      <CardShell
        eyebrow={`Update “${action.eventTitle}”`}
        rightLabel="Confirm to update"
        accent="update"
      >
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <DiffSide
            label="Before"
            title={action.current.title}
            start={action.current.start}
            end={action.current.end}
          />
          <DiffSide
            label="After"
            title={updates.title ?? action.current.title}
            start={updates.start ?? action.current.start}
            end={updates.end ?? action.current.end}
            location={updates.location ?? undefined}
            description={updates.description ?? undefined}
          />
        </div>
        <CardActions
          busy={busy}
          confirmLabel="Confirm & update"
          confirmIcon={<Check className="mr-1.5 size-3.5" strokeWidth={2.25} />}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </CardShell>
    );
  }

  // delete
  return (
    <CardShell
      eyebrow={`Cancel “${action.eventTitle}”?`}
      rightLabel="Destructive action"
      accent="delete"
    >
      <EventBlock
        title={action.current.title}
        start={action.current.start}
        end={action.current.end}
        muted
      />
      <CardActions
        busy={busy}
        confirmLabel="Yes, cancel it"
        confirmIcon={<Trash2 className="mr-1.5 size-3.5" strokeWidth={2.25} />}
        confirmVariant="default"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </CardShell>
  );
}

function CardShell({
  eyebrow,
  rightLabel,
  accent,
  children,
}: {
  eyebrow: string;
  rightLabel: string;
  accent: "add" | "update" | "delete";
  children: React.ReactNode;
}) {
  const barColor =
    accent === "delete"
      ? "bg-accent"
      : accent === "update"
        ? "bg-ink"
        : "bg-accent";
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-rule bg-cream">
      <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
          {eyebrow}
        </div>
        <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
          {rightLabel}
        </div>
      </div>
      <div className="flex items-stretch">
        <div className={`w-1.5 ${barColor}`} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function EventBlock({
  title,
  start,
  end,
  location,
  description,
  muted = false,
}: {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  muted?: boolean;
}) {
  const s = new Date(start);
  const e = new Date(end);
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted">
        {dayFmt.format(s)}
      </div>
      <div
        className={`font-display text-2xl tracking-tight ${
          muted ? "text-ink-soft line-through" : "text-ink"
        }`}
      >
        {title}
      </div>
      <div className="font-mono text-xs text-ink-soft">
        {timeFmt.format(s)} – {timeFmt.format(e)}
      </div>
      {location && (
        <div className="text-sm text-ink-soft">📍 {location}</div>
      )}
      {description && (
        <div className="text-sm leading-relaxed text-ink-soft">
          {description}
        </div>
      )}
    </div>
  );
}

function DiffSide({
  label,
  title,
  start,
  end,
  location,
  description,
}: {
  label: "Before" | "After";
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}) {
  const s = new Date(start);
  const e = new Date(end);
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border border-rule ${
        label === "Before" ? "bg-surface" : "bg-cream"
      } p-3.5`}
    >
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted">
        {label}
      </div>
      <div
        className={`font-display text-lg tracking-tight ${
          label === "Before" ? "text-ink-soft" : "text-ink"
        }`}
      >
        {title}
      </div>
      <div className="font-mono text-xs text-ink-soft">
        {dayFmt.format(s)} · {timeFmt.format(s)} – {timeFmt.format(e)}
      </div>
      {location && (
        <div className="text-xs text-ink-soft">📍 {location}</div>
      )}
      {description && (
        <div className="text-xs leading-relaxed text-ink-soft">
          {description}
        </div>
      )}
    </div>
  );
}

function CardActions({
  busy,
  confirmLabel,
  confirmIcon,
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  confirmLabel: string;
  confirmIcon: React.ReactNode;
  confirmVariant?: "default" | "accent";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
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
      <Button
        type="button"
        size="sm"
        variant={confirmVariant}
        onClick={onConfirm}
        disabled={busy}
      >
        {busy ? (
          "Working…"
        ) : (
          <>
            {confirmIcon}
            {confirmLabel}
          </>
        )}
      </Button>
    </div>
  );
}

// Re-export ParsedEvent only so the existing import path keeps working if needed.
export type { ParsedEvent };
