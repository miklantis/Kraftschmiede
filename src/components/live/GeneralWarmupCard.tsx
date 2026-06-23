import type { LiveGeneralWarmupSet } from "@/lib/liveSession";
import { LiveNumberInput } from "./LiveNumberInput";
import { SetCheck } from "./SetCheck";

// Allgemeines Aufwaermen (Cardio) als erste Karte der Session (Phase 11,
// Lieferung 3, jetzt interaktiv): Dauer (min) editierbar, Art waehlbar, Satz
// abhaken, +/- Satz. 1:1 wie V1 (kl-gw): kein Pausen-Timer fuer das Aufwaermen.

const GW_MODES: [string, string][] = [
  ["bike", "Rad"],
  ["row", "Rudern"],
  ["walk", "Gehen"],
  ["vario", "Vario"],
  ["other", "Sonstiges"],
];

const ROW = "grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2";

export function GeneralWarmupCard({
  sets,
  onToggle,
  onMinutes,
  onMode,
  onAdd,
  onDel,
}: {
  sets: LiveGeneralWarmupSet[];
  onToggle: (si: number) => void;
  onMinutes: (si: number, value: number) => void;
  onMode: (si: number, mode: string) => void;
  onAdd: () => void;
  onDel: () => void;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[14px] bg-card shadow-card">
      <div className="border-b border-border px-4 py-3 text-[15px] font-semibold text-foreground">
        Aufwärmen
      </div>
      <div className="px-4 py-2">
        <div
          className={
            ROW + " py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          }
        >
          <span>Satz</span>
          <span>Dauer (min)</span>
          <span>Art</span>
          <span />
        </div>
        {sets.map((ws, i) => (
          <div
            key={i}
            className={
              ROW +
              " border-t border-border py-2 text-[14px]" +
              (ws.done ? " opacity-55" : "")
            }
          >
            <span className="text-muted-foreground">S{i + 1}</span>
            <LiveNumberInput
              value={ws.minutes}
              onCommit={(v) => onMinutes(i, v)}
              decimal={false}
              ariaLabel={"Dauer Aufwaermsatz " + (i + 1)}
            />
            <select
              aria-label={"Art Aufwaermsatz " + (i + 1)}
              className="w-full rounded-[8px] border border-border bg-background px-2 py-1 text-[14px] text-foreground outline-none focus:border-primary"
              value={ws.mode}
              onChange={(e) => onMode(i, e.target.value)}
            >
              {GW_MODES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <SetCheck
              done={ws.done}
              active={false}
              onToggle={() => onToggle(i)}
              ariaLabel={"Aufwaermsatz " + (i + 1) + " abhaken"}
            />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onAdd}
            className="rounded-[8px] bg-secondary px-3 py-1 text-[13px] font-medium text-foreground"
          >
            + Satz
          </button>
          {sets.length > 1 && (
            <button
              type="button"
              onClick={onDel}
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
