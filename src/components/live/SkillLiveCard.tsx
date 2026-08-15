import type { SkillLiveExercise } from "@/lib/liveSession";
import { LiveNumberInput } from "./LiveNumberInput";
import { SkillWatchValue } from "./SkillWatchValue";
import { SetCheck } from "./SetCheck";
import { skillTargetLabel } from "@/lib/labels";
import { NoteBlock } from "@/components/ui/note-block";

// Eine Uebungskarte der laufenden Skill-Einheit (Phase 11, Lieferung 5).
// Kopf mit Name, optionalem Tempo und dem Metrik-Tag (WDH/DAUER); Tabelle
// Satz | Ziel | Ergebnis | Haken. Bei Haltezeit kommt die Stoppuhr-Zelle, bei
// Wiederholungen das einfache Zahlenfeld. Anders als beim Kraft-Workout gibt es
// keinen aktiven (naechsten) Satz und keine Pausen-Vorschlaege - nur abhaken und
// das Ergebnis eintragen (V1-Paritaet liveSkillSession).

const ROW = "grid grid-cols-[34px_1fr_1.4fr_30px] items-center gap-2";
// Bearbeiten-Modus (Verlauf): ohne Haken-Spalte.
const ROW_EDIT = "grid grid-cols-[34px_1fr_1.4fr] items-center gap-2";

function rowCls(grid: string, done: boolean): string {
  const base = grid + " my-0.5 rounded-[11px] border-2 px-1.5 py-2 text-[14px]";
  return done ? base + " border-transparent bg-primary/[0.07]" : base + " border-transparent";
}

export function SkillLiveCard({
  exercise,
  watchSi,
  onToggleSet,
  onValue,
  onStartWatch,
  onStopWatch,
  editMode = false,
  onAddSet,
  onDelSet,
  onNote,
}: {
  exercise: SkillLiveExercise;
  /** Index des Satzes mit laufender Stoppuhr in dieser Uebung, sonst null. */
  watchSi: number | null;
  onToggleSet: (si: number) => void;
  onValue: (si: number, value: number) => void;
  onStartWatch: (si: number) => void;
  onStopWatch: () => void;
  /** Bearbeiten-Modus (Verlauf): Stoppuhr/Haken aus, einfaches Zahlenfeld,
   *  „+/- Satz“. Default false = unveraenderter Live-Look. */
  editMode?: boolean;
  onAddSet?: () => void;
  onDelSet?: () => void;
  /** Notiz der Uebung setzen (Vorhaben #136). Ohne diese Naht bleibt die Karte
   *  unveraendert - dann gibt es keinen „+ Notiz“-Knopf. */
  onNote?: (note: string) => void;
}): React.ReactElement {
  const isDur = exercise.metric === "duration";
  const tag = isDur ? "DAUER" : "WDH";
  const targetLabel = skillTargetLabel(exercise.target, exercise.metric, true);
  const grid = editMode ? ROW_EDIT : ROW;

  // Fusszeile: „+ Satz“ / „– Satz“ gibt es nur im Bearbeiten-Modus. Traegt die
  // Karte eine Notiz (onNote gesetzt), sitzt „+ Notiz“ dort rechts daneben; im
  // Live-Betrieb bleibt nur die schlanke Notiz-Zeile.
  const setButtons = (
    <>
      <button
        type="button"
        onClick={onAddSet}
        className="text-[13px] font-semibold text-primary"
      >
        + Satz
      </button>
      {exercise.sets.length > 1 && (
        <button
          type="button"
          onClick={onDelSet}
          className="text-[13px] font-semibold text-muted-foreground"
        >
          – Satz
        </button>
      )}
    </>
  );

  return (
    <div className="overflow-hidden rounded-[14px] bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-bold text-foreground">{exercise.name}</div>
          {exercise.tempo && (
            <div className="mt-0.5 text-[12px] text-muted-foreground">{exercise.tempo}</div>
          )}
        </div>
        <span className="flex-none rounded-pill bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {tag}
        </span>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div
          className={
            grid +
            " border-b border-border px-1.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&>span]:text-center"
          }
        >
          <span>Satz</span>
          <span>Ziel</span>
          <span>Ergebnis</span>
          {!editMode && <span />}
        </div>

        {exercise.sets.map((st, si) => (
          <div key={si} className={rowCls(grid, st.done)}>
            <span className="text-center text-muted-foreground">S{si + 1}</span>
            <span className="text-center font-mono text-muted-foreground">{targetLabel}</span>
            {isDur && !editMode ? (
              <SkillWatchValue
                value={st.value}
                active={watchSi === si}
                onStart={() => onStartWatch(si)}
                onStop={onStopWatch}
                onCommit={(v) => onValue(si, v)}
                ariaLabel={"Haltezeit Satz " + (si + 1)}
              />
            ) : (
              <LiveNumberInput
                value={st.value ?? 0}
                onCommit={(v) => onValue(si, v)}
                decimal={false}
                ariaLabel={(isDur ? "Haltezeit Satz " : "Wiederholungen Satz ") + (si + 1)}
              />
            )}
            {!editMode && (
              <SetCheck
                done={st.done}
                active={false}
                onToggle={() => onToggleSet(si)}
                ariaLabel={"Satz " + (si + 1) + " abhaken"}
              />
            )}
          </div>
        ))}

        {(editMode || onNote) && (
          <div className="px-1.5 pb-1 pt-4">
            {onNote ? (
              <NoteBlock
                value={exercise.note}
                onChange={onNote}
                compact
                placeholder="Was ist bei dieser Übung passiert?"
                actions={editMode ? setButtons : undefined}
              />
            ) : (
              <div className="flex items-center gap-4">{setButtons}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
