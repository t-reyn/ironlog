"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { deleteTemplate, type TemplateWithSets } from "@/lib/db";
import { confirmDialog } from "@/lib/dialog";
import { toast } from "@/lib/toast";
import { MUSCLE_COLORS } from "@/lib/muscles";
import type { MovementPattern, Readiness } from "@/lib/types";
import { ExerciseIcon } from "./ExerciseIcon";
import { Icon } from "./ShojinUI";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateEditor } from "./TemplateEditor";

const READINESS_ROWS: { key: keyof Readiness; label: string; hint: string }[] = [
  { key: "sleep", label: "Sleep", hint: "poor → great" },
  { key: "energy", label: "Energy", hint: "drained → fresh" },
  { key: "soreness", label: "Soreness", hint: "none → very sore" },
];

/** ~3.5 min per set, rounded to a friendly 5. */
function estimateMinutes(setCount: number): number {
  return Math.max(5, Math.round((setCount * 3.5) / 5) * 5);
}

/** Local YYYY-MM-DD for a <input type="date"> value (avoids UTC day-shift). */
function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TemplateCard({
  template,
  icons,
  onStart,
  onManage,
}: {
  template: TemplateWithSets;
  icons: { name: string | null; pattern: MovementPattern; color: string }[];
  onStart: () => void;
  onManage: () => void;
}) {
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);

  const exCount = new Set(template.sets.map((s) => s.exercise_id)).size;
  const setCount = template.sets.length;

  // ~12px slop so finger jitter doesn't cancel the hold, but scrolling does.
  function pressStart(e: React.PointerEvent) {
    longPressed.current = false;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      onManage();
    }, 550);
  }
  function pressEnd() {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }
  function pressMove(e: React.PointerEvent) {
    const o = pressOrigin.current;
    if (!o) return;
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    if (dx * dx + dy * dy > 144) pressEnd();
  }

  return (
    <div
      onPointerDown={pressStart}
      onPointerUp={pressEnd}
      onPointerLeave={pressEnd}
      onPointerMove={pressMove}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center gap-3 rounded-[22px] border border-line-2 bg-surface px-3.5 py-3 shadow-[var(--rp-shadow-sm)]"
      title="Hold to edit or delete"
    >
      <div className="flex shrink-0">
        {icons.map((ic, i) => (
          <span key={i} style={{ color: ic.color, marginLeft: i > 0 ? -8 : 0 }}>
            <ExerciseIcon name={ic.name} pattern={ic.pattern} size={28} />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">{template.name}</div>
        <div className="mt-0.5 truncate whitespace-nowrap font-mono text-[10.5px] uppercase text-ink-faint">
          {exCount} EXERCISES · {setCount} SETS · ~{estimateMinutes(setCount)} MIN
        </div>
      </div>
      <button
        onClick={() => {
          if (!longPressed.current) onStart();
        }}
        className="shrink-0 rounded-full bg-amber px-4 py-2 font-mono text-[12.5px] font-bold text-on-amber"
      >
        Start
      </button>
    </div>
  );
}

export function StartModal({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const workouts = useStore((s) => s.workouts);
  const templates = useStore((s) => s.templates);
  const startBlank = useStore((s) => s.startBlank);
  const startBackdated = useStore((s) => s.startBackdated);
  const startFromWorkout = useStore((s) => s.startFromWorkout);
  const startFromTemplate = useStore((s) => s.startFromTemplate);
  const exerciseById = useStore((s) => s.exerciseById);
  const setDraftReadiness = useStore((s) => s.setDraftReadiness);
  const refreshTemplates = useStore((s) => s.refreshTemplates);
  const draft = useStore((s) => s.draft);

  const [building, setBuilding] = useState(false);
  const [editingTpl, setEditingTpl] = useState<TemplateWithSets | null>(null);
  const [managingTpl, setManagingTpl] = useState<TemplateWithSets | null>(null);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [todayInput] = useState(() => toDateInput(Date.now()));
  const [pastDate, setPastDate] = useState(() => toDateInput(Date.now() - 86400000));

  const [dateLabel] = useState(() =>
    new Date()
      .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      .replace(",", " ·")
      .toUpperCase(),
  );

  const recent = useMemo(
    () => [...workouts].sort((a, b) => b.performed_at.localeCompare(a.performed_at)).slice(0, 5),
    [workouts],
  );
  const last = recent[0];

  // Readiness moves here from the logger — defaults carry from the last session.
  const [readiness, setReadiness] = useState<Readiness>(() => {
    const w = [...useStore.getState().workouts].sort((a, b) =>
      b.performed_at.localeCompare(a.performed_at),
    )[0];
    return {
      sleep: w?.readiness_sleep ?? null,
      energy: w?.readiness_energy ?? null,
      soreness: w?.readiness_soreness ?? null,
    };
  });

  async function doStart(fn: () => void, applyReadiness = true) {
    if (draft) {
      const ok = await confirmDialog({
        title: "Replace workout in progress?",
        message: "You have an unfinished workout. Starting this one will discard it.",
        confirmLabel: "Replace",
        cancelLabel: "Keep current",
        danger: true,
      });
      if (!ok) return;
    }
    fn();
    // A backdated session carries no "today" readiness check-in.
    if (applyReadiness) setDraftReadiness(readiness);
    onStart();
  }

  function startPast() {
    const at = new Date(`${pastDate}T12:00:00`).getTime();
    doStart(() => startBackdated(at), false);
  }

  async function removeTpl(t: TemplateWithSets) {
    const ok = await confirmDialog({
      title: "Delete template?",
      message: `“${t.name}” will be permanently removed.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTemplate(t.id);
      await refreshTemplates();
      toast.success(`Deleted “${t.name}”.`);
    } catch {
      toast.error("Couldn't delete template.");
    }
  }

  function tplIcons(t: TemplateWithSets) {
    const ids = [...new Set(t.sets.map((s) => s.exercise_id))].slice(0, 3);
    return ids.map((id) => {
      const ex = exerciseById(id);
      return {
        name: ex?.name ?? null,
        pattern: ex?.movement_pattern ?? "other",
        color: MUSCLE_COLORS[ex?.muscle_group ?? "core"],
      };
    });
  }

  function recentMeta(w: (typeof recent)[number]): string {
    const dow = new Date(w.performed_at)
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();
    const sets = w.sets.filter((s) => !s.is_warmup && s.completed).length;
    return `${dow} · ${sets} SETS`;
  }

  const answered = READINESS_ROWS.map((r) => readiness[r.key]);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={onClose}>
        <div
          className="sheet-up flex max-h-[88dvh] w-full max-w-3xl flex-col rounded-t-[28px] bg-bg"
          style={{ boxShadow: "0 -12px 40px rgba(43,39,37,0.25)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} aria-label="Close" className="block h-5 w-full shrink-0 pt-2.5">
            <span className="mx-auto block h-1 w-[38px] rounded-full bg-line" />
          </button>

          <div className="overflow-y-auto px-5 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-1">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Start training</h2>
              <span className="font-mono text-[11px] text-ink-faint">{dateLabel}</span>
            </div>

            {/* readiness check-in — one compact row, expands to the steppers */}
            <div className="mb-3.5 rounded-[18px] border border-line-2 bg-surface px-3.5 py-2.5 shadow-[var(--rp-shadow-sm)]">
              <button
                onClick={() => setReadinessOpen((v) => !v)}
                aria-expanded={readinessOpen}
                className="flex w-full items-center gap-2"
              >
                <span className="rp-eyebrow shrink-0" style={{ fontSize: 9.5 }}>
                  READY?
                </span>
                {READINESS_ROWS.map(({ key, label }, i) => (
                  <span key={key} className="flex flex-1 items-center justify-center gap-1.5">
                    <span className="text-xs font-semibold text-ink-soft">{label}</span>
                    <span className="font-mono text-xs font-bold text-ink">{answered[i] ?? "–"}</span>
                  </span>
                ))}
                <span
                  className="shrink-0 text-ink-faint transition-transform duration-150"
                  style={{ display: "inline-block", transform: readinessOpen ? "rotate(-90deg)" : "rotate(90deg)" }}
                >
                  <Icon name="chevron" size={14} color="currentColor" />
                </span>
              </button>

              {readinessOpen && (
                <div className="mt-3 flex flex-col gap-2.5 pb-1">
                  {READINESS_ROWS.map(({ key, label, hint }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-[72px] shrink-0 text-[13px] font-semibold text-ink-soft" title={hint}>
                        {label}
                      </span>
                      <div className="flex flex-1 gap-1.5">
                        {[1, 2, 3, 4, 5].map((v) => {
                          const on = readiness[key] === v;
                          return (
                            <button
                              key={v}
                              onClick={() => setReadiness((r) => ({ ...r, [key]: on ? null : v }))}
                              aria-pressed={on}
                              aria-label={`${label} ${v} of 5`}
                              className={[
                                "h-9 flex-1 rounded-lg text-sm font-semibold transition-colors",
                                on
                                  ? "bg-ink text-bg"
                                  : "border border-line bg-surface-2 text-ink-faint hover:text-ink-soft",
                              ].join(" ")}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* quick start duo */}
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => doStart(startBlank)}
                className="rounded-[22px] bg-green p-3.5 pb-3 text-left text-on-green"
              >
                <Icon name="plus" size={20} color="currentColor" sw={2.2} />
                <div className="mt-2.5 text-[15px] font-bold">Empty workout</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase" style={{ color: "color-mix(in srgb, var(--rp-on-green) 60%, transparent)" }}>
                  BUILD AS YOU GO
                </div>
              </button>
              <button
                onClick={() => last && doStart(() => startFromWorkout(last))}
                disabled={!last}
                className="rounded-[22px] border border-line-2 bg-surface p-3.5 pb-3 text-left shadow-[var(--rp-shadow-sm)] disabled:opacity-50"
              >
                <span className="text-amber">
                  <Icon name="play" size={20} color="currentColor" />
                </span>
                <div className="mt-2.5 whitespace-nowrap text-[15px] font-bold text-ink">Repeat last</div>
                <div className="mt-0.5 truncate font-mono text-[10px] uppercase text-ink-faint">
                  {last ? `${last.name} · ${recentMeta(last).split(" · ")[0]}` : "NOTHING YET"}
                </div>
              </button>
            </div>

            {/* log a past workout — backdated session you forgot to record */}
            <div className="mb-4 rounded-[18px] border border-line-2 bg-surface px-3.5 py-2.5 shadow-[var(--rp-shadow-sm)]">
              <button
                onClick={() => setPastOpen((v) => !v)}
                aria-expanded={pastOpen}
                className="flex w-full items-center gap-2"
              >
                <span className="text-ink-soft">
                  <Icon name="edit" size={16} color="currentColor" />
                </span>
                <span className="flex-1 text-left text-[14px] font-semibold text-ink">Log a past workout</span>
                <span
                  className="shrink-0 text-ink-faint transition-transform duration-150"
                  style={{ display: "inline-block", transform: pastOpen ? "rotate(-90deg)" : "rotate(90deg)" }}
                >
                  <Icon name="chevron" size={14} color="currentColor" />
                </span>
              </button>
              {pastOpen && (
                <div className="mt-3 flex items-center gap-2 pb-1">
                  <input
                    type="date"
                    value={pastDate}
                    max={todayInput}
                    onChange={(e) => e.target.value && setPastDate(e.target.value)}
                    aria-label="Workout date"
                    className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink"
                  />
                  <button
                    onClick={startPast}
                    className="h-10 shrink-0 rounded-lg bg-amber px-4 font-mono text-[12.5px] font-bold text-on-amber"
                  >
                    Log it
                  </button>
                </div>
              )}
            </div>

            {/* templates inline */}
            <div className="mb-2 flex items-baseline justify-between">
              <span className="rp-eyebrow">TEMPLATES</span>
              <button onClick={() => setBuilding(true)} className="text-[13px] font-semibold text-green-ink">
                + New
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="mb-4 px-1 text-sm text-ink-faint">No templates yet — save one from a workout, or create one.</p>
            ) : (
              <div className="mb-4 flex flex-col gap-2">
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    icons={tplIcons(t)}
                    onStart={() => doStart(() => startFromTemplate(t))}
                    onManage={() => setManagingTpl(t)}
                  />
                ))}
              </div>
            )}

            {/* recent one-liners */}
            {recent.length > 0 && (
              <>
                <div className="rp-eyebrow mb-1">RECENT</div>
                <div className="flex flex-col">
                  {recent.map((w, i) => (
                    <button
                      key={w.id}
                      onClick={() => doStart(() => startFromWorkout(w))}
                      className={[
                        "flex items-center gap-2.5 px-1 py-[11px] text-left",
                        i > 0 ? "border-t border-line-2" : "",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink">{w.name}</span>
                      <span className="shrink-0 font-mono text-[10.5px] text-ink-faint">{recentMeta(w)}</span>
                      <span className="shrink-0 text-ink-faint">
                        <Icon name="chevron" size={15} color="currentColor" />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* long-press template management */}
      {managingTpl && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setManagingTpl(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="sheet-up relative mx-auto w-full max-w-3xl rounded-t-[28px] bg-bg px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2.5"
            style={{ boxShadow: "0 -12px 40px rgba(43,39,37,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-[38px] rounded-full bg-line" />
            <div className="rp-eyebrow mb-1 px-1">{managingTpl.name}</div>
            <button
              onClick={() => {
                setEditingTpl(managingTpl);
                setManagingTpl(null);
              }}
              className="flex w-full items-center gap-3 px-1 py-3 text-left text-[15px] font-semibold text-ink"
            >
              <span className="text-ink-soft"><Icon name="edit" size={17} color="currentColor" /></span>
              Edit template
            </button>
            <button
              onClick={() => {
                const t = managingTpl;
                setManagingTpl(null);
                removeTpl(t);
              }}
              className="flex w-full items-center gap-3 border-t border-line-2 px-1 py-3 text-left text-[15px] font-semibold text-danger-soft"
            >
              <Icon name="trash" size={17} color="currentColor" />
              Delete template
            </button>
          </div>
        </div>
      )}

      {building && <TemplateBuilder onClose={() => setBuilding(false)} />}

      {editingTpl && (
        <TemplateEditor
          template={editingTpl}
          onSave={async () => {
            await refreshTemplates();
            setEditingTpl(null);
          }}
          onClose={() => setEditingTpl(null)}
        />
      )}
    </>
  );
}
