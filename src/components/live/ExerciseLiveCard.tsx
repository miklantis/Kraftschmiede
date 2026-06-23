import { Circle } from "lucide-react";
import { scoreInfo } from "@/engine";
import { fmtNum } from "@/lib/format";
import type { LiveEntry } from "@/lib/liveSession";
import type { ActiveSet } from "@/lib/liveFlow";
import { isActive } from "@/lib/liveFlow";
import type { LiveBarChoice } from "@/hooks/useLiveSession";
import { PlateChips } from "./PlateChips";
import { LiveNumberInput } from "./LiveNumberInput";
import { SetCheck } from "./SetCheck";

// Eine Uebungskarte der laufenden Session (Phase 11, Lieferung 3, interaktiv):
// Kopf mit Name/Tag, Stangenauswahl und Scheiben-Schalter; Tabelle Satz | Wdh |
// kg | RIR | Haken - erst Aufwaerm- (A1..), dann Arbeitssaetze (S1..). Werte
// werden ueber das fokus-erhaltende Live-Feld committet; Abhaken/Stange/Scheiben
// schreiben sofort. Der aktive (naechste) Satz ist gruen hervorgehoben.

const ROW = "grid grid-cols-[28px_1fr_1fr_minmax(44px,56px)_28px] items-center gap-2";
const RIR_VALUES = [1, 2, 3, 4, 5];

function rowCls(active: boolean, done: boolean): string {
  return (
    ROW +
    " border-t border-border py-2 text-[14px]" +
    (done ? " opacity-55" : active ? " bg-primary/5" : "")
  );
}

export function ExerciseLiveCard({
  entry,
  ei,
  active,
  plateMode,
  plates,
  bars,
  unit,
  onToggleWarm,
  onToggleSet,
  onWarmValue,
  onSetValue,
  onAddSet,
  onDelSet,
  onChangeBar,
  onCyclePlate,
}: {
  entry: LiveEntry;
  ei: number;
  active: ActiveSet | null;
  plateMode: number;
  plates: number[];
  bars: LiveBarChoice[];
  unit: string;
  onToggleWarm: (wi: number) => void;
  onToggleSet: (si: number) => void;
  onWarmValue: (wi: number, kind: "reps" | "weight", value: number) => void;
  onSetValue: (si: number, kind: "reps" | "weight" | "score", value: number) => void;
  onAddSet: () => void;
  onDelSet: () => void;
  onChangeBar: (bar: LiveBarChoice) => void;
  onCyclePlate: () => void;
}): React.ReactElement {
  const isBar = entry.category === "barbell" && entry.barWeight != null;
  const hasPlates = isBar && plates.length > 0;

  function chips(weight: number, warm: boolean, idx: number, done: boolean): React.ReactElement | null {
    if (!hasPlates || plateMode === 0 || done) return null;
    const act = isActive(active, ei, idx, warm);
    if (plateMode === 2 && !act) return null;
    return (
      <div className="pb-1.5">
        <PlateChips total={weight} barWeight={entry.barWeight!} plates={plates} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-card shadow-card">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-foreground">
            {entry.exerciseName}
          </div>
          {entry.tag && (
            <div className="mt-0.5 text-[12px] text-muted-foreground">{entry.tag}</div>
          )}
        </div>
        {isBar && bars.length > 0 && (
          <select
            aria-label="Stange wählen"
            className="max-w-[150px] rounded-[8px] border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary"
            value={entry.barId ?? ""}
            onChange={(e) => {
              const b = bars.find((x) => x.id === e.target.value);
              if (b) onChangeBar(b);
            }}
          >
            {bars.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {fmtNum(b.weight)} {unit}
              </option>
            ))}
          </select>
        )}
        {isBar && (
          <button
            type="button"
            aria-label="Scheiben anzeigen"
            title="Scheiben"
            onClick={onCyclePlate}
            className={
              "flex size-[30px] flex-none items-center justify-center rounded-[8px] border transition-colors " +
              (plateMode > 0
                ? "border-primary text-primary"
                : "border-border text-muted-foreground")
            }
          >
            <Circle className="size-[15px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        <div
          className={
            ROW + " py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          }
        >
          <span>Satz</span>
          <span>Wdh</span>
          <span>kg</span>
          <span>RIR</span>
          <span />
        </div>

        {entry.warmupSets.map((ws, wi) => {
          const act = isActive(active, ei, wi, true) && !ws.done;
          return (
            <div key={"w" + wi}>
              <div className={rowCls(act, ws.done)}>
                <span className="text-muted-foreground">A{wi + 1}</span>
                <LiveNumberInput
                  value={ws.reps}
                  onCommit={(v) => onWarmValue(wi, "reps", v)}
                  decimal={false}
                  ariaLabel={"Wdh Aufwaermsatz " + (wi + 1)}
                />
                <LiveNumberInput
                  value={ws.weight}
                  onCommit={(v) => onWarmValue(wi, "weight", v)}
                  decimal
                  ariaLabel={"Gewicht Aufwaermsatz " + (wi + 1)}
                />
                <span className="text-center text-muted-foreground">–</span>
                <SetCheck
                  done={ws.done}
                  active={act}
                  onToggle={() => onToggleWarm(wi)}
                  ariaLabel={"Aufwaermsatz " + (wi + 1) + " abhaken"}
                />
              </div>
              {chips(ws.weight, true, wi, ws.done)}
            </div>
          );
        })}

        {entry.sets.map((st, si) => {
          const act = isActive(active, ei, si, false) && !st.done;
          return (
            <div key={"s" + si}>
              <div className={rowCls(act, st.done)}>
                <span className="text-muted-foreground">S{si + 1}</span>
                <LiveNumberInput
                  value={st.reps}
                  onCommit={(v) => onSetValue(si, "reps", v)}
                  decimal={false}
                  ariaLabel={"Wdh Satz " + (si + 1)}
                />
                <LiveNumberInput
                  value={st.weight}
                  onCommit={(v) => onSetValue(si, "weight", v)}
                  decimal
                  ariaLabel={"Gewicht Satz " + (si + 1)}
                />
                <select
                  aria-label={"RIR Satz " + (si + 1)}
                  title="RIR / Score je Satz"
                  className="w-full rounded-[8px] border border-border bg-background px-1 py-1 text-center font-mono text-[13px] text-foreground outline-none focus:border-primary"
                  value={st.score}
                  onChange={(e) => onSetValue(si, "score", Number(e.target.value))}
                >
                  {RIR_VALUES.map((v) => {
                    const inf = scoreInfo(v);
                    return (
                      <option key={v} value={v}>
                        {inf ? inf.rir : v}
                      </option>
                    );
                  })}
                </select>
                <SetCheck
                  done={st.done}
                  active={act}
                  onToggle={() => onToggleSet(si)}
                  ariaLabel={"Satz " + (si + 1) + " abhaken"}
                />
              </div>
              {chips(st.weight, false, si, st.done)}
            </div>
          );
        })}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onAddSet}
            className="rounded-[8px] bg-secondary px-3 py-1 text-[13px] font-medium text-foreground"
          >
            + Satz
          </button>
          {entry.sets.length > 1 && (
            <button
              type="button"
              onClick={onDelSet}
              className="rounded-[8px] px-3 py-1 text-[13px] font-medium text-muted-foreground"
            >
              – Satz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
