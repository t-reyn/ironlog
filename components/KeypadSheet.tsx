"use client";

import { useState, type ReactNode } from "react";
import { incrementFor } from "@/lib/progression";
import type { PrevHint } from "@/lib/progression";
import type { Unit } from "@/lib/types";
import { fmtPrev, type ValueField } from "./SetRow";
import { Icon } from "./ShojinUI";

// RPE below 5 isn't meaningful for tracking, so 1–4 collapse into a single "<5"
// bucket (stored as 5); the working range 6–10 stays granular.
const RPE_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "<5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
];

const BAR_WEIGHT: Record<Unit, number> = { kg: 20, lb: 45 };

function fmtNum(n: number): string {
  return Number.isInteger(n) ? `${n}` : `${Math.round(n * 100) / 100}`;
}

interface Props {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  prev: PrevHint | null;
  field: ValueField;
  values: { weight: number; reps: number; seconds: number };
  rpe: number | null;
  unit: Unit;
  isBodyweight: boolean;
  isDuration: boolean;
  equipment: string;
  onField: (field: ValueField) => void;
  onInput: (field: ValueField, value: number) => void;
  onRpe: (rpe: number | null) => void;
  onLog: () => void;
  onClose: () => void;
}

export function KeypadSheet({
  exerciseName,
  setNumber,
  totalSets,
  prev,
  field,
  values,
  rpe,
  unit,
  isBodyweight,
  isDuration,
  equipment,
  onField,
  onInput,
  onRpe,
  onLog,
  onClose,
}: Props) {
  // Raw digits typed since this field was focused; null = untouched, so the
  // cells show the current (effective) value until the first keypress.
  const [entry, setEntry] = useState<{ field: ValueField; text: string } | null>(null);

  const secondField: ValueField = isDuration ? "seconds" : "reps";
  const inc = field === "weight" ? incrementFor(equipment, unit) : field === "seconds" ? 10 : 1;

  function displayFor(f: ValueField): string {
    if (entry && entry.field === f) return entry.text || "0";
    return fmtNum(values[f]);
  }

  function commitText(f: ValueField, text: string) {
    setEntry({ field: f, text });
    onInput(f, parseFloat(text) || 0);
  }

  function pressDigit(d: string) {
    const base = entry?.field === field ? entry.text : "";
    if (d === "." && (field !== "weight" || base.includes("."))) return;
    const next = base === "0" && d !== "." ? d : base + d;
    if (next.replace(".", "").length > 5) return;
    commitText(field, next);
  }

  function backspace() {
    const base = entry?.field === field ? entry.text : fmtNum(values[field]);
    commitText(field, base.slice(0, -1));
  }

  function nudge(delta: number) {
    const next = Math.max(0, Math.round((values[field] + delta) * 100) / 100);
    setEntry({ field, text: fmtNum(next) });
    onInput(field, next);
  }

  function setTo(f: ValueField, v: number) {
    setEntry({ field: f, text: fmtNum(v) });
    onInput(f, v);
  }

  const quickChips: { label: string; onTap: () => void }[] =
    field === "weight"
      ? [
          ...(prev
            ? [{ label: `Same as last · ${fmtNum(prev.weight)}`, onTap: () => setTo("weight", prev.weight) }]
            : []),
          ...(!isBodyweight && equipment === "barbell"
            ? [{ label: `Bar · ${BAR_WEIGHT[unit]}`, onTap: () => setTo("weight", BAR_WEIGHT[unit]) }]
            : []),
          {
            label: "+ plate",
            onTap: () => setTo("weight", values.weight + 2 * incrementFor(equipment, unit)),
          },
        ]
      : [
          ...(prev
            ? [
                {
                  label: `Same as last · ${isDuration ? `${prev.seconds}s` : fmtNum(prev.reps)}`,
                  onTap: () => setTo(secondField, isDuration ? prev.seconds : prev.reps),
                },
              ]
            : []),
          { label: `+${inc}`, onTap: () => nudge(inc) },
          { label: `−${inc}`, onTap: () => nudge(-inc) },
        ];

  const key = (
    label: ReactNode,
    onTap: () => void,
    opts: { soft?: boolean; accent?: boolean; tall?: boolean; small?: boolean; aria?: string } = {},
  ) => (
    <button
      onClick={onTap}
      aria-label={opts.aria}
      className={[
        "flex items-center justify-center gap-1.5 rounded-[14px] font-mono font-semibold",
        opts.tall ? "row-span-2 self-stretch" : "h-[50px]",
        opts.small ? "text-[13px]" : "text-xl",
        opts.accent
          ? "bg-amber font-bold text-on-amber"
          : opts.soft
            ? "border border-line bg-surface-2 text-ink-soft"
            : "border border-line bg-surface text-ink active:bg-surface-2",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const fieldLabel = (f: ValueField) =>
    f === "weight" ? (isBodyweight ? `+ ${unit}` : unit) : f === "seconds" ? "sec" : "reps";

  return (
    <div
      className="sheet-up fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-3xl rounded-t-[28px] border-t border-line bg-bg px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2.5"
      style={{ boxShadow: "0 -12px 40px rgba(43,39,37,0.18)" }}
      role="dialog"
      aria-label={`Keypad for ${exerciseName} set ${setNumber}`}
    >
      <button
        onClick={onClose}
        aria-label="Close keypad"
        className="mx-auto mb-3 block h-4 w-full"
      >
        <span className="mx-auto block h-1 w-[38px] rounded-full bg-line" />
      </button>

      <div className="mb-2.5 flex items-center justify-between">
        <span className="rp-eyebrow min-w-0 truncate">
          {exerciseName} · SET {setNumber} OF {totalSets}
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase text-ink-faint">
          {prev ? `LAST ${fmtPrev(prev, isDuration)}` : ""}
        </span>
      </div>

      {/* field switcher */}
      <div className="mb-2.5 grid grid-cols-2 gap-2">
        {([["weight", isBodyweight ? `+ ${unit.toUpperCase()}` : unit.toUpperCase()], [secondField, secondField === "seconds" ? "SEC" : "REPS"]] as [ValueField, string][]).map(
          ([f, label]) => {
            const on = field === f;
            return (
              <button
                key={f}
                onClick={() => onField(f)}
                aria-pressed={on}
                aria-label={`Edit ${fieldLabel(f)}`}
                className={[
                  "rounded-2xl bg-surface px-3.5 py-2 text-left",
                  on ? "border-[1.5px] border-amber" : "border border-line",
                ].join(" ")}
              >
                <span
                  className="rp-eyebrow block"
                  style={{ fontSize: 9, color: on ? "var(--rp-amber)" : undefined }}
                >
                  {label}
                </span>
                <span className="mt-px block font-mono text-2xl font-bold text-ink">
                  {displayFor(f)}
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* RPE chips */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="rp-eyebrow mr-0.5" style={{ fontSize: 9.5 }}>
          RPE
        </span>
        {RPE_OPTIONS.map((o) => {
          const on = rpe === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onRpe(on ? null : o.value)}
              aria-pressed={on}
              aria-label={`RPE ${o.label}`}
              className={[
                "h-[34px] flex-1 rounded-[10px] font-mono text-[13px] font-semibold",
                on ? "bg-ink text-bg" : "border border-line bg-surface text-ink-faint",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* quick chips */}
      {quickChips.length > 0 && (
        <div className="mb-2.5 flex gap-2">
          {quickChips.map((c, i) => (
            <button
              key={i}
              onClick={c.onTap}
              className={[
                "flex h-[34px] items-center justify-center whitespace-nowrap rounded-full border border-line-2 bg-surface-2 px-3 font-mono text-[11.5px] font-semibold text-ink-soft",
                i === 0 ? "flex-[1.4]" : "flex-1",
              ].join(" ")}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* key grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr 1.12fr" }}>
        {key("1", () => pressDigit("1"))}
        {key("2", () => pressDigit("2"))}
        {key("3", () => pressDigit("3"))}
        {key(`+${inc}`, () => nudge(inc), { soft: true, small: true, aria: `Add ${inc}` })}
        {key("4", () => pressDigit("4"))}
        {key("5", () => pressDigit("5"))}
        {key("6", () => pressDigit("6"))}
        {key(`−${inc}`, () => nudge(-inc), { soft: true, small: true, aria: `Subtract ${inc}` })}
        {key("7", () => pressDigit("7"))}
        {key("8", () => pressDigit("8"))}
        {key("9", () => pressDigit("9"))}
        {key(
          <>
            <Icon name="check" size={18} color="currentColor" sw={2.6} />
            Log
          </>,
          onLog,
          { accent: true, tall: true, small: true, aria: `Log set ${setNumber}` },
        )}
        {key(".", () => pressDigit("."), { aria: "Decimal point" })}
        {key("0", () => pressDigit("0"))}
        {key(<Icon name="backspace" size={20} color="currentColor" sw={1.9} />, backspace, {
          aria: "Backspace",
        })}
      </div>
    </div>
  );
}
