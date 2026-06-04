"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  Check,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  CreateAction,
  CreateManyAction,
  DeleteAction,
  UpdateAction,
} from "@/lib/event-schema";
import { formatRecurrence } from "@/lib/recurrence";

/* ─── types ─── */

type Action = CreateAction | CreateManyAction | UpdateAction | DeleteAction;

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Present only on assistant messages that proposed a write. */
  pendingAction?: Action;
  /** "pending" while awaiting confirm, "confirmed" / "cancelled" afterward. */
  actionStatus?: "pending" | "confirming" | "confirmed" | "cancelled";
};

type ChatResponse = {
  message: string;
  pendingAction: Action | null;
};

/* ─── formatting ─── */

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function newId() {
  return Math.random().toString(36).slice(2);
}

/* ─── component ─── */

export function Assistant() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledPromptRef = useRef<string | null>(null);

  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  // Pre-fill from URL ?prompt=... so deep links (e.g. nudge banners)
  // can drop a draft message into the input without auto-sending.
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (prompt && handledPromptRef.current !== prompt) {
      handledPromptRef.current = prompt;
      setInput(prompt);
      // Focus the input so the user can hit Go immediately.
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchParams]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { id: newId(), role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          timezone: tz,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as ChatResponse;
      const assistantMsg: Message = {
        id: newId(),
        role: "assistant",
        text: data.message,
        ...(data.pendingAction
          ? { pendingAction: data.pendingAction, actionStatus: "pending" }
          : {}),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction(messageId: string, action: Action) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, actionStatus: "confirming" } : m,
      ),
    );

    try {
      const { endpoint, body } = endpointFor(action, tz);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }

      const summary = summaryFor(action);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionStatus: "confirmed" } : m,
        ),
      );
      // Add a system-style confirmation receipt
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: `✓ ${summary}`,
        },
      ]);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionStatus: "pending" } : m,
        ),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          text: `⚠️ ${msg}`,
        },
      ]);
    }
  }

  function rejectAction(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, actionStatus: "cancelled" } : m,
      ),
    );
  }

  function clearConversation() {
    setMessages([]);
    setCollapsed(false);
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2">
        {hasMessages && !collapsed && (
          <section className="overflow-hidden rounded-2xl border border-rule bg-surface/97 shadow-[0_30px_80px_-25px_rgba(26,22,18,0.4)] backdrop-blur-xl">
            <header className="flex items-center justify-between border-b border-rule px-4 py-2.5">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
                <Sparkles className="size-3.5" />
                Conversation with Cal AI
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearConversation}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  <RotateCw className="size-3" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse"
                  className="flex size-6 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((m) => (
                <MessageView
                  key={m.id}
                  message={m}
                  onConfirm={() =>
                    m.pendingAction && confirmAction(m.id, m.pendingAction)
                  }
                  onReject={() => rejectAction(m.id)}
                />
              ))}
              {busy && <ThinkingBubble />}
            </div>
          </section>
        )}

        {hasMessages && collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="self-start rounded-full border border-rule bg-surface/95 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-soft shadow-[0_10px_30px_-15px_rgba(26,22,18,0.3)] backdrop-blur-xl hover:text-ink"
          >
            ↑ Conversation ({messages.length})
          </button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-rule bg-surface/95 p-1.5 pl-4 shadow-[0_24px_60px_-20px_rgba(26,22,18,0.35)] backdrop-blur-xl"
        >
          <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask Cal AI anything · or just describe what you need"
            aria-label="Ask Cal AI"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder-muted outline-none disabled:opacity-60"
          />
          <Button
            type="submit"
            size="default"
            disabled={!input.trim() || busy}
            className="group h-10"
          >
            {busy ? (
              "Thinking…"
            ) : (
              <>
                Go
                <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function endpointFor(
  action: Action,
  tz: string,
): { endpoint: string; body: unknown } {
  if (action.action === "create") {
    return {
      endpoint: "/api/events/create",
      body: { ...action.event, timezone: tz },
    };
  }
  if (action.action === "create_many") {
    return {
      endpoint: "/api/events/create-batch",
      body: { events: action.events, timezone: tz },
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
    };
  }
  return {
    endpoint: "/api/events/delete",
    body: { eventId: action.eventId },
  };
}

function summaryFor(action: Action): string {
  if (action.action === "create")
    return `Added "${action.event.title}" to your calendar.`;
  if (action.action === "create_many")
    return `Added ${action.events.length} blocks for "${action.groupTitle}".`;
  if (action.action === "update") return `Updated "${action.eventTitle}".`;
  return `Cancelled "${action.eventTitle}".`;
}

/* ─── message rendering ─── */

function MessageView({
  message,
  onConfirm,
  onReject,
}: {
  message: Message;
  onConfirm: () => void;
  onReject: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[14px] leading-relaxed text-cream">
          {message.text}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex flex-col items-start gap-2">
      {message.text && (
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-cream px-3.5 py-2 text-[14px] leading-relaxed text-ink">
          {message.text}
        </div>
      )}
      {message.pendingAction && (
        <ActionCard
          action={message.pendingAction}
          status={message.actionStatus ?? "pending"}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5">
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
      </div>
    </div>
  );
}

/* ─── action cards (embedded in chat) ─── */

function ActionCard({
  action,
  status,
  onConfirm,
  onReject,
}: {
  action: Action;
  status: NonNullable<Message["actionStatus"]>;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const isResolved = status === "confirmed" || status === "cancelled";
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-rule bg-cream">
      <CardHeader action={action} status={status} />
      <BodyForAction action={action} resolved={isResolved} />
      {!isResolved && (
        <CardActions
          action={action}
          busy={status === "confirming"}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      )}
      {status === "confirmed" && <StatusBar variant="confirmed" />}
      {status === "cancelled" && <StatusBar variant="cancelled" />}
    </div>
  );
}

function CardHeader({
  action,
  status,
}: {
  action: Action;
  status: NonNullable<Message["actionStatus"]>;
}) {
  const labels = {
    create: "Proposed event",
    create_many: "Proposed study blocks",
    update: "Proposed change",
    delete: "Cancel event?",
  };
  const sideLabel =
    status === "confirmed"
      ? "Confirmed"
      : status === "cancelled"
        ? "Cancelled"
        : status === "confirming"
          ? "Working…"
          : "Awaiting confirm";
  return (
    <div className="flex items-center justify-between border-b border-rule px-3.5 py-2">
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
        {labels[action.action]}
      </div>
      <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
        {sideLabel}
      </div>
    </div>
  );
}

function BodyForAction({
  action,
  resolved,
}: {
  action: Action;
  resolved: boolean;
}) {
  const barColor = action.action === "delete" ? "bg-accent" : "bg-ink";
  return (
    <div className="flex items-stretch">
      <div className={`w-1.5 ${barColor}`} />
      <div className="flex-1">
        {action.action === "create" && (
          <EventBlock
            title={action.event.title}
            start={action.event.start}
            end={action.event.end}
            location={action.event.location ?? undefined}
            description={action.event.description ?? undefined}
            recurrenceSummary={formatRecurrence(action.event.recurrence)}
          />
        )}
        {action.action === "create_many" && (
          <ManyBlocksList action={action} />
        )}
        {action.action === "update" && (
          <div className="grid grid-cols-1 gap-2.5 px-3.5 py-3 sm:grid-cols-2">
            <DiffSide
              label="Before"
              title={action.current.title}
              start={action.current.start}
              end={action.current.end}
            />
            <DiffSide
              label="After"
              title={action.updates.title ?? action.current.title}
              start={action.updates.start ?? action.current.start}
              end={action.updates.end ?? action.current.end}
              location={action.updates.location ?? undefined}
              description={action.updates.description ?? undefined}
            />
          </div>
        )}
        {action.action === "delete" && (
          <EventBlock
            title={action.current.title}
            start={action.current.start}
            end={action.current.end}
            muted={!resolved}
          />
        )}
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
  recurrenceSummary,
}: {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  muted?: boolean;
  recurrenceSummary?: string | null;
}) {
  const s = new Date(start);
  const e = new Date(end);
  return (
    <div className="flex flex-col gap-1.5 px-3.5 py-3">
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
        {dayFmt.format(s)}
      </div>
      <div
        className={`font-display text-lg tracking-tight ${
          muted ? "text-ink-soft line-through" : "text-ink"
        }`}
      >
        {title}
      </div>
      <div className="font-mono text-xs text-ink-soft">
        {timeFmt.format(s)} – {timeFmt.format(e)}
      </div>
      {recurrenceSummary && (
        <div className="font-mono text-[11px] tracking-wider uppercase text-accent">
          ↻ {recurrenceSummary}
        </div>
      )}
      {location && <div className="text-sm text-ink-soft">📍 {location}</div>}
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
      className={`flex flex-col gap-1 rounded-lg border border-rule ${
        label === "Before" ? "bg-surface" : "bg-cream-deep/30"
      } p-2.5`}
    >
      <div className="font-mono text-[9px] tracking-[0.22em] uppercase text-muted">
        {label}
      </div>
      <div
        className={`font-display text-sm tracking-tight ${
          label === "Before" ? "text-ink-soft" : "text-ink"
        }`}
      >
        {title}
      </div>
      <div className="font-mono text-[11px] text-ink-soft">
        {dayFmt.format(s)} · {timeFmt.format(s)}–{timeFmt.format(e)}
      </div>
      {location && (
        <div className="text-[11px] text-ink-soft">📍 {location}</div>
      )}
    </div>
  );
}

function ManyBlocksList({ action }: { action: CreateManyAction }) {
  const dayShortFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const tFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const totalMin = action.totalMinutes ?? 0;
  const schedMin = action.scheduledMinutes ?? 0;
  const shortBy = totalMin && schedMin && totalMin - schedMin > 0
    ? totalMin - schedMin
    : 0;
  return (
    <div className="flex flex-col gap-2 px-3.5 py-3">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg tracking-tight text-ink">
          {action.groupTitle}
        </div>
        <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted">
          {action.events.length}{" "}
          {action.events.length === 1 ? "block" : "blocks"}
          {schedMin > 0 && ` · ${fmtMin(schedMin)}`}
        </div>
      </div>
      {shortBy > 0 && (
        <div className="rounded-md bg-amber-100/60 px-2.5 py-1.5 text-[12px] text-amber-900">
          Could only fit {fmtMin(schedMin)} of {fmtMin(totalMin)} requested.
          Add more days or shorten the deadline.
        </div>
      )}
      <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pt-1">
        {action.events.map((ev, i) => {
          const s = new Date(ev.start);
          const e = new Date(ev.end);
          return (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-rule/60 bg-cream px-2.5 py-1.5"
            >
              <Calendar className="size-3.5 shrink-0 text-accent" />
              <span className="font-mono text-[10px] tracking-wider uppercase text-muted">
                {dayShortFmt.format(s)}
              </span>
              <span className="font-mono text-[11px] text-ink-soft">
                {tFmt.format(s)}–{tFmt.format(e)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtMin(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function CardActions({
  action,
  busy,
  onConfirm,
  onReject,
}: {
  action: Action;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const isDelete = action.action === "delete";
  const isMany = action.action === "create_many";
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-cream-deep/30 px-3.5 py-2.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onReject}
        disabled={busy}
      >
        Cancel
      </Button>
      <Button type="button" size="sm" onClick={onConfirm} disabled={busy}>
        {busy ? (
          "Working…"
        ) : isDelete ? (
          <>
            <Trash2 className="mr-1.5 size-3.5" strokeWidth={2.25} />
            Yes, cancel it
          </>
        ) : isMany ? (
          <>
            <Check className="mr-1.5 size-3.5" strokeWidth={2.25} />
            Add all blocks
          </>
        ) : (
          <>
            <Check className="mr-1.5 size-3.5" strokeWidth={2.25} />
            Confirm
          </>
        )}
      </Button>
    </div>
  );
}

function StatusBar({ variant }: { variant: "confirmed" | "cancelled" }) {
  return (
    <div
      className={`flex items-center gap-2 border-t border-rule px-3.5 py-2 font-mono text-[10px] tracking-[0.22em] uppercase ${
        variant === "confirmed" ? "text-emerald-700" : "text-muted"
      }`}
    >
      {variant === "confirmed" ? (
        <>
          <Check className="size-3.5" strokeWidth={2.5} />
          Done
        </>
      ) : (
        <>
          <X className="size-3.5" strokeWidth={2.5} />
          Skipped
        </>
      )}
    </div>
  );
}
