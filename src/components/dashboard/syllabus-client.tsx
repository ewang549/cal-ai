"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Syllabus } from "@/lib/syllabus-schema";

/**
 * Interactive part of the syllabus import page. Lives as a client component
 * so it can hold the multi-stage state machine, while the parent page.tsx
 * stays a server component that handles auth + renders <Nav />.
 *
 * Stages: idle → parsing → preview → importing → success | error
 */

type Stage =
  | { kind: "idle" }
  | { kind: "parsing"; filename?: string }
  | { kind: "preview"; syllabus: Syllabus; filename?: string }
  | { kind: "importing"; syllabus: Syllabus }
  | { kind: "success"; created: number; failed: number; items: string[] }
  | { kind: "error"; message: string };

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TYPE_TONE: Record<string, string> = {
  exam: "bg-accent text-cream",
  quiz: "bg-amber-600 text-cream",
  assignment: "bg-ink text-cream",
  project: "bg-emerald-600 text-cream",
  presentation: "bg-amber-700 text-cream",
  reading: "bg-rule text-ink",
  other: "bg-rule text-ink",
};

export function SyllabusClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [mode, setMode] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState("");
  const [includeMeetings, setIncludeMeetings] = useState(true);
  const [includedDeadlines, setIncludedDeadlines] = useState<Set<string>>(
    new Set(),
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tz =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setStage({
          kind: "error",
          message: "Only PDFs supported for upload. Paste text instead?",
        });
        return;
      }
      setStage({ kind: "parsing", filename: file.name });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timezone", tz);
      try {
        const res = await fetch("/api/syllabus/parse", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Parse failed (${res.status})`);
        }
        const syllabus = (await res.json()) as Syllabus;
        setStage({ kind: "preview", syllabus, filename: file.name });
        setIncludedDeadlines(new Set(syllabus.deadlines.map((d) => d.title)));
      } catch (err) {
        setStage({
          kind: "error",
          message: err instanceof Error ? err.message : "Parse failed",
        });
      }
    },
    [tz],
  );

  async function handleParseText() {
    if (pastedText.trim().length < 100) {
      setStage({
        kind: "error",
        message:
          "Paste at least a hundred characters — the meeting times and deadlines section is plenty.",
      });
      return;
    }
    setStage({ kind: "parsing" });
    try {
      const res = await fetch("/api/syllabus/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText, timezone: tz }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Parse failed (${res.status})`);
      }
      const syllabus = (await res.json()) as Syllabus;
      setStage({ kind: "preview", syllabus });
      setIncludedDeadlines(new Set(syllabus.deadlines.map((d) => d.title)));
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Parse failed",
      });
    }
  }

  async function handleImport(syllabus: Syllabus) {
    setStage({ kind: "importing", syllabus });
    try {
      const res = await fetch("/api/syllabus/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabus,
          timezone: tz,
          selection: {
            includeMeetings,
            includeDeadlines: Array.from(includedDeadlines),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Import failed (${res.status})`);
      }
      const data = (await res.json()) as {
        created: number;
        failed: number;
        items: string[];
      };
      setStage({
        kind: "success",
        created: data.created,
        failed: data.failed,
        items: data.items,
      });
      router.refresh();
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  function toggleDeadline(title: string) {
    setIncludedDeadlines((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function resetToIdle() {
    setStage({ kind: "idle" });
    setPastedText("");
  }

  return (
    <>
      <a
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] uppercase text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        Back to calendar
      </a>

      <header className="mb-10">
        <div className="font-mono text-xs tracking-[0.22em] uppercase text-accent">
          New for this term
        </div>
        <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
          Drop a syllabus.{" "}
          <span className="italic text-accent">Skip the spreadsheet.</span>
        </h1>
        <p className="mt-3 max-w-lg leading-relaxed text-ink-soft">
          Cal AI reads the meeting times, every exam, every assignment, and
          every project from your syllabus and puts them on your calendar in
          under a minute. Review everything before it ships.
        </p>
      </header>

      {stage.kind === "idle" && (
        <IdleStage
          mode={mode}
          setMode={setMode}
          dragOver={dragOver}
          setDragOver={setDragOver}
          fileInputRef={fileInputRef}
          onFile={handleFile}
          pastedText={pastedText}
          setPastedText={setPastedText}
          onParseText={handleParseText}
        />
      )}

      {stage.kind === "parsing" && <ParsingStage filename={stage.filename} />}

      {stage.kind === "preview" && (
        <PreviewSection
          syllabus={stage.syllabus}
          includeMeetings={includeMeetings}
          setIncludeMeetings={setIncludeMeetings}
          includedDeadlines={includedDeadlines}
          toggleDeadline={toggleDeadline}
          onConfirm={() => handleImport(stage.syllabus)}
          onRestart={resetToIdle}
        />
      )}

      {stage.kind === "importing" && (
        <ImportingStage
          eventCount={countSelectedItems(
            stage.syllabus,
            includeMeetings,
            includedDeadlines,
          )}
        />
      )}

      {stage.kind === "success" && (
        <SuccessStage
          created={stage.created}
          failed={stage.failed}
          items={stage.items}
          onAnother={resetToIdle}
        />
      )}

      {stage.kind === "error" && (
        <ErrorState message={stage.message} onRetry={resetToIdle} />
      )}
    </>
  );
}

/* ─── stage views ─── */

function IdleStage({
  mode,
  setMode,
  dragOver,
  setDragOver,
  fileInputRef,
  onFile,
  pastedText,
  setPastedText,
  onParseText,
}: {
  mode: "file" | "text";
  setMode: (m: "file" | "text") => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  pastedText: string;
  setPastedText: (v: string) => void;
  onParseText: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-rule bg-surface p-1">
        <ModeToggle
          active={mode === "file"}
          label="Upload PDF"
          icon={<FileText className="size-3.5" />}
          onClick={() => setMode("file")}
        />
        <ModeToggle
          active={mode === "text"}
          label="Paste text"
          icon={<BookOpen className="size-3.5" />}
          onClick={() => setMode("text")}
        />
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-surface px-8 py-16 text-center transition-colors duration-200",
            dragOver
              ? "border-accent bg-accent/[0.04]"
              : "border-rule hover:border-accent/40",
          ].join(" ")}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload syllabus PDF"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <div className="flex size-14 items-center justify-center rounded-full bg-ink text-cream">
            <Upload className="size-6" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="font-display text-xl italic text-ink">
            Drop your syllabus PDF here
          </div>
          <div className="text-sm text-muted">
            or click to choose · max 10 MB
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="syllabus-text" className="sr-only">
            Paste syllabus text
          </label>
          <textarea
            id="syllabus-text"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste anything from your syllabus — meeting times, the schedule of deadlines, exam dates…"
            className="h-72 w-full resize-none rounded-2xl border border-rule bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors duration-200 focus:border-accent"
          />
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={onParseText}
              disabled={pastedText.trim().length < 100}
              className="group"
            >
              Extract
              <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParsingStage({ filename }: { filename?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-rule bg-surface px-8 py-20 text-center"
    >
      <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
      <div className="font-display text-xl italic text-ink">
        Reading your syllabus…
      </div>
      {filename && (
        <div className="font-mono text-xs text-muted">{filename}</div>
      )}
      <div className="text-sm text-muted">
        Claude is extracting meeting times and deadlines. This usually takes
        5–15 seconds for a full syllabus.
      </div>
    </div>
  );
}

function ImportingStage({ eventCount }: { eventCount: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-rule bg-surface px-8 py-20 text-center"
    >
      <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
      <div className="font-display text-xl italic text-ink">
        Adding to your calendar…
      </div>
      <div className="text-sm text-muted">
        Creating {eventCount} events on Google Calendar.
      </div>
    </div>
  );
}

function SuccessStage({
  created,
  failed,
  items,
  onAnother,
}: {
  created: number;
  failed: number;
  items: string[];
  onAnother: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-rule bg-surface"
    >
      <div className="flex items-center gap-3 border-b border-rule px-6 py-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-cream">
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        </div>
        <div>
          <div className="font-display text-xl tracking-tight text-ink">
            Your semester is on the calendar.
          </div>
          <div className="text-sm text-ink-soft">
            {created} {created === 1 ? "event" : "events"} created
            {failed > 0 ? ` · ${failed} failed` : ""}.
          </div>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="max-h-64 overflow-y-auto px-6 py-4">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 py-1.5 text-sm text-ink-soft"
            >
              <Check
                className="size-3.5 shrink-0 text-emerald-600"
                aria-hidden
              />
              <span className="truncate">{item}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-cream-deep/30 px-6 py-3">
        <Button size="sm" variant="ghost" onClick={onAnother}>
          Import another
        </Button>
        <Button size="sm" asChild>
          <a href="/dashboard?view=month">
            See it on the calendar
            <ArrowUpRight className="ml-1.5 size-4" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rule bg-surface px-6 py-5"
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-cream">
        <X className="size-4" strokeWidth={2.5} aria-hidden />
      </div>
      <div className="flex-1">
        <div className="font-display text-lg text-ink">
          That didn&apos;t work.
        </div>
        <div className="mt-1 text-sm text-ink-soft">{message}</div>
        <div className="mt-3">
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */

function countSelectedItems(
  syllabus: Syllabus,
  includeMeetings: boolean,
  includedDeadlines: Set<string>,
): number {
  const m = includeMeetings ? syllabus.course.meetings.length : 0;
  const d = syllabus.deadlines.filter((dl) =>
    includedDeadlines.has(dl.title),
  ).length;
  return m + d;
}

function ModeToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream shadow-[0_4px_12px_-4px_rgba(26,22,18,0.4)]"
          : "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors duration-200 hover:text-ink"
      }
    >
      {icon}
      {label}
    </button>
  );
}

function PreviewSection({
  syllabus,
  includeMeetings,
  setIncludeMeetings,
  includedDeadlines,
  toggleDeadline,
  onConfirm,
  onRestart,
}: {
  syllabus: Syllabus;
  includeMeetings: boolean;
  setIncludeMeetings: (v: boolean) => void;
  includedDeadlines: Set<string>;
  toggleDeadline: (title: string) => void;
  onConfirm: () => void;
  onRestart: () => void;
}) {
  const sortedDeadlines = [...syllabus.deadlines].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="border-b border-rule px-5 py-3">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            Course
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="font-display text-2xl tracking-tight text-ink">
            {syllabus.course.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-wider uppercase text-muted">
            {syllabus.course.code && <span>{syllabus.course.code}</span>}
            {syllabus.course.instructor && (
              <>
                <span>·</span>
                <span>{syllabus.course.instructor}</span>
              </>
            )}
            {syllabus.course.term && (
              <>
                <span>·</span>
                <span>{syllabus.course.term}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            Class meetings
          </div>
          <ToggleSwitch checked={includeMeetings} onChange={setIncludeMeetings} />
        </div>
        <div className="px-5 py-4">
          {syllabus.course.meetings.length === 0 ? (
            <div className="text-sm text-muted">
              No recurring meeting times found.
            </div>
          ) : (
            <ul className="space-y-2">
              {syllabus.course.meetings.map((m, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <span className="font-display text-lg text-ink">
                    {m.days.join(", ")}
                  </span>
                  <span className="font-mono text-sm text-ink-soft">
                    {fmtRange(m.startTime, m.endTime)}
                  </span>
                  {m.location && (
                    <span className="font-mono text-xs text-muted">
                      · {m.location}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted">
                    · {fmtDate(m.firstMeeting)} → {fmtDate(m.lastMeeting)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent">
            Deadlines
          </div>
          <div className="font-mono text-[10px] tracking-wider uppercase text-muted">
            {includedDeadlines.size} of {sortedDeadlines.length} selected
          </div>
        </div>
        {sortedDeadlines.length === 0 ? (
          <div className="px-5 py-4 text-sm text-muted">
            No deadlines found. You can add them later by chatting with Cal AI.
          </div>
        ) : (
          <ul className="divide-y divide-rule/60">
            {sortedDeadlines.map((d) => {
              const checked = includedDeadlines.has(d.title);
              return (
                <li key={d.title}>
                  <button
                    type="button"
                    onClick={() => toggleDeadline(d.title)}
                    aria-pressed={checked}
                    className={[
                      "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150",
                      checked
                        ? "bg-surface hover:bg-cream-deep/30"
                        : "bg-cream/40 opacity-60 hover:opacity-100",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
                        checked
                          ? "border-accent bg-accent text-cream"
                          : "border-rule bg-surface",
                      ].join(" ")}
                    >
                      {checked && (
                        <Check className="size-3.5" strokeWidth={2.5} />
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[0.18em] uppercase ${
                        TYPE_TONE[d.type] ?? TYPE_TONE.other
                      }`}
                    >
                      {d.type}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                      {d.title}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {fmtDate(d.dueDate)}
                      {d.dueTime && ` · ${d.dueTime}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="default" variant="ghost" onClick={onRestart}>
          Start over
        </Button>
        <Button size="lg" onClick={onConfirm} className="group">
          <Sparkles className="mr-1.5 size-4" aria-hidden />
          Add{" "}
          {(includeMeetings ? syllabus.course.meetings.length : 0) +
            includedDeadlines.size}{" "}
          to my calendar
          <ArrowUpRight className="ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "bg-rule",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-block size-4 transform rounded-full bg-cream shadow-sm transition-transform duration-200",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function fmtRange(start: string, end: string): string {
  return `${fmt12(start)} – ${fmt12(end)}`;
}

function fmt12(hm: string): string {
  const [hStr, mStr] = hm.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === "00" ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return dayFmt.format(date);
}
