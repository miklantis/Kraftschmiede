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

const ROW = "grid grid-cols-[34px_1fr_1.4fr_30px] items-center gap-2";

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
      <div className="border-b border-border px-4 py-3 text-[18px] font-bold text-foreground">
        Aufwärmen
      </div>
      <div className="px-4 pb-4 pt-2">
        <div
          className={
            ROW + " border-b border-border px-1.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&>span]:text-center"
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
              " my-0.5 rounded-[11px] border-2 border-transparent px-1.5 py-2 text-[14px]" +
              (ws.done ? " bg-primary/[0.07]" : "")
            }
          >
            <span className="text-center text-muted-foreground">S{i + 1}</span>
            <LiveNumberInput
              value={ws.minutes}
              onCommit={(v) => onMinutes(i, v)}
              decimal={false}
              ariaLabel={"Dauer Aufwaermsatz " + (i + 1)}
            />
            <select
              aria-label={"Art Aufwaermsatz " + (i + 1)}
              className="w-full appearance-none rounded-[8px] bg-transparent px-1 py-1 text-center text-[14px] text-foreground outline-none focus:bg-secondary/70"
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
        <div className="flex gap-4 px-1.5 pb-1 pt-4">
          <button
            type="button"
            onClick={onAdd}
            className="text-[13px] font-semibold text-primary"
          >
            + Satz
          </button>
          {sets.length > 1 && (
            <button
              type="button"
              onClick={onDel}
              className="text-[13px] font-semibold text-muted-foreground"
            >
              – Satz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
