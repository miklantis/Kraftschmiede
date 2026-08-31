import { useState } from "react";
import { CircleDot } from "lucide-react";
import { scoreInfo } from "@/engine";
import { fmtNum } from "@/lib/format";
import type { LiveEntry } from "@/lib/liveSession";
import type { ActiveSet } from "@/lib/liveFlow";
import { isActive } from "@/lib/liveFlow";
import { previewProvisional, type LiveCoachPreview } from "@/lib/livePreview";
import { coachLineLabel, coachOutlookLabel } from "@/lib/coachText";
import type { LiveBarChoice } from "@/hooks/useLiveSession";
import { PlateChips } from "./PlateChips";
import { LiveNumberInput } from "./LiveNumberInput";
import { SetCheck } from "./SetCheck";
import { NoteBlock } from "@/components/ui/note-block";
import { CoachStatusDot, coachStateLabel } from "@/components/ui/coach-status-dot";

// Eine Uebungskarte der laufenden Session (Phase 11, Lieferung 3, interaktiv):
// Kopf mit Name/Tag, Stangenauswahl und Scheiben-Schalter; Tabelle Satz | Wdh |
// kg | RIR | Haken - erst Aufwaerm- (A1..), dann Arbeitssaetze (S1..). Werte
// werden ueber das fokus-erhaltende Live-Feld committet; Abhaken/Stange/Scheiben
// schreiben sofort. Der aktive (naechste) Satz ist gruen hervorgehoben.

const ROW = "grid grid-cols-[34px_1fr_1fr_minmax(46px,58px)_30px] items-center gap-2";
// Bearbeiten-Modus: ohne Haken-Spalte (kein Abhaken), sonst gleiche Spalten.
const ROW_EDIT = "grid grid-cols-[34px_1fr_1fr_minmax(46px,58px)] items-center gap-2";
// Test-Modus (1RM-Test): ohne RIR-Spalte, Haken bleibt. Die drei Varianten
// stehen bewusst als vollstaendige Klassen-Literale da (Tailwind erkennt keine
// zur Laufzeit zusammengesetzten Klassennamen).
const ROW_TEST = "grid grid-cols-[34px_1fr_1fr_30px] items-center gap-2";
const RIR_VALUES = [1, 2, 3, 4, 5];
// Uebungsname im Kartenkopf. Als Knopf (#412) bleibt die Optik dieselbe -
// `block w-full text-left` haelt den Zeilenumbruch und die darunter stehenden
// Zusaetze (Einstieg-Pille, Tag) genau da, wo sie beim reinen Text sassen.
const NAME = "text-[18px] font-bold text-foreground";
const NAME_LINK =
  " block w-full cursor-pointer rounded-[8px] text-left transition-colors" +
  " hover:text-primary focus-visible:outline-none focus-visible:ring-2" +
  " focus-visible:ring-primary/50";

// Zeilenstil wie V1: 2px-Rahmen (transparent als Basis, damit aktiv kein Sprung),
// aktiver Satz weisser Grund + gruener Rahmen, erledigter Satz leicht gruen.
function rowCls(grid: string, active: boolean, done: boolean, warm: boolean): string {
  const base = grid + " my-0.5 rounded-[11px] border-2 px-1.5 py-2 text-[14px]";
  const tone = warm ? " text-muted-foreground" : "";
  if (done) return base + tone + " border-transparent bg-primary/[0.07]";
  if (active) return base + tone + " border-primary bg-card";
  return base + tone + " border-transparent";
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
  onOpen,
  onNote,
  coach,
  editMode = false,
  hideScore = false,
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
  /** Uebungsseite oeffnen (#412). Nur die laufende Einheit reicht das durch:
   *  das Panel klappt ein und die Detailseite liegt dahinter. Fehlt der
   *  Rueckruf, bleibt der Name reiner Text - so ist der Bearbeiten-Modus im
   *  Verlauf unveraendert. */
  onOpen?: () => void;
  /** Notiz zur Uebung uebernehmen (Vorhaben #136). Fehlt der Rueckruf, zeigt die
   *  Karte gar keine Notiz - so bleibt der Verlaufs-Bearbeiten-Modus vorerst
   *  unveraendert (Schritt 3 haengt ihn an). */
  onNote?: (note: string) => void;
  /** Coach-Vorschau fuer diesen Block (#191): was diese Woche gilt bzw. was der
   *  Coach beim naechsten Mal vorschlagen wuerde. Im Wochenplan steht sie von
   *  Beginn der Einheit an, sonst ab dem ersten abgehakten Satz (#268). Fehlt
   *  sie, zeigt die Karte gar kein Coach-Zeichen - so bleiben Verlauf-Bearbeiten
   *  und 1RM-Test unveraendert. */
  coach?: LiveCoachPreview;
  /** Bearbeiten-Modus (Verlauf): Stange/Scheiben/Haken/Aufwaermsaetze aus,
   *  Werte + RIR + „+/- Satz“ bleiben. Default false = unveraenderter Live-Look. */
  editMode?: boolean;
  /** RIR-Spalte ausblenden (1RM-Test: dort zaehlt nur Gewicht x Wdh).
   *  Default false = unveraenderter Live-Look. */
  hideScore?: boolean;
}): React.ReactElement {
  const isBar = entry.equipment === "barbell" && entry.barWeight != null;
  const hasPlates = isBar && plates.length > 0;
  const grid = editMode ? ROW_EDIT : hideScore ? ROW_TEST : ROW;
  // Das Coach-Zeichen zeigt nur die Richtung; das Konkrete steht in der Zeile,
  // die beim Antippen aufklappt (bewusst kein Popup - im Bodenblatt der
  // Live-Ansicht ist eine aufklappende Zeile ruhiger und immer sichtbar).
  const [showCoach, setShowCoach] = useState(false);
  // Zwischenstand betrifft nur die Zeile, die noch wandern kann: in der
  // Kraftphase den Ausblick, sonst den Vorschlag selbst. Steht nichts
  // Wanderndes auf der Karte, bleibt auch das Coach-Zeichen fest (#268).
  const coachOffen = coach ? previewProvisional(coach) : false;

  // Fusszeile: „+ Satz“ / „– Satz“. Traegt die Karte eine Notiz (onNote gesetzt),
  // sitzt der „+ Notiz“-Knopf in derselben Zeile rechts daneben und das Feld
  // klappt darunter auf - sonst bleibt die Zeile unveraendert.
  const setButtons = (
    <>
      <button
        type="button"
        onClick={onAddSet}
        className="text-[13px] font-semibold text-primary"
      >
        + Satz
      </button>
      {entry.sets.length > 1 && (
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

  function chips(weight: number, warm: boolean, idx: number, done: boolean): React.ReactElement | null {
    if (!hasPlates || plateMode === 0 || done) return null;
    const act = isActive(active, ei, idx, warm);
    if (plateMode === 2 && !act) return null;
    return (
      <PlateChips
        total={weight}
        barWeight={entry.barWeight!}
        plates={plates}
        active={act}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              aria-label={entry.exerciseName + " öffnen"}
              className={NAME + NAME_LINK}
            >
              {entry.exerciseName}
            </button>
          ) : (
            <div className={NAME}>{entry.exerciseName}</div>
          )}
          {entry.phaseEntry && (
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Einstieg
            </span>
          )}
          {entry.tag && (
            <div className="mt-0.5 text-[12px] text-muted-foreground">{entry.tag}</div>
          )}
        </div>
        {coach && (
          <button
            type="button"
            onClick={() => setShowCoach((v) => !v)}
            aria-expanded={showCoach}
            aria-label={
              "Coach: " +
              coachStateLabel(coach.status.state) +
              (coachOffen ? " (Zwischenstand)" : "") +
              " – Vorschlag anzeigen"
            }
            title={coachStateLabel(coach.status.state)}
            className="flex-none"
          >
            <CoachStatusDot state={coach.status.state} provisional={coachOffen} />
          </button>
        )}
        {!editMode && isBar && bars.length > 0 && (
          <select
            aria-label="Stange wählen"
            className="h-[34px] max-w-[150px] flex-none rounded-[8px] border border-border bg-background px-2.5 text-[12px] text-foreground outline-none focus:border-primary"
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
        {!editMode && isBar && (
          <button
            type="button"
            aria-label="Scheiben anzeigen"
            title="Scheiben"
            onClick={onCyclePlate}
            className={
              "flex size-[34px] flex-none items-center justify-center rounded-[8px] border transition-colors " +
              (plateMode > 0
                ? "border-primary text-primary"
                : "border-border text-muted-foreground")
            }
          >
            <CircleDot className="size-[16px]" strokeWidth={2} />
          </button>
        )}
      </div>

      {coach && showCoach && (
        <div className="border-b border-border bg-muted/50 px-4 py-2.5">
          <div className="text-[13px] font-semibold text-foreground">
            {coachLineLabel(coach.scope, coach.provisional)}:{" "}
            {fmtNum(coach.status.weight)} {unit} · {coach.status.targetReps} Wdh.
          </div>
          {coach.status.note && (
            <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {coach.status.note}
            </div>
          )}
          {coach.outlook && (
            <div className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
              {coachOutlookLabel(coach.provisional)}:{" "}
              {fmtNum(coach.outlook.weight)} {unit} · {coach.outlook.targetReps} Wdh.
            </div>
          )}
        </div>
      )}

      <div className="px-4 pb-4 pt-2">
        <div
          className={
            grid + " border-b border-border px-1.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground [&>span]:text-center"
          }
        >
          <span>Satz</span>
          <span>Wdh</span>
          <span>kg</span>
          {!hideScore && <span>RIR</span>}
          {!editMode && <span />}
        </div>

        {!editMode && entry.warmupSets.map((ws, wi) => {
          const act = isActive(active, ei, wi, true) && !ws.done;
          return (
            <div key={"w" + wi}>
              <div className={rowCls(grid, act, ws.done, true)}>
                <span className="text-center text-muted-foreground">A{wi + 1}</span>
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
                {!hideScore && (
                  <span className="text-center text-muted-foreground">–</span>
                )}
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
              <div className={rowCls(grid, act, st.done, false)}>
                <span className="text-center text-muted-foreground">S{si + 1}</span>
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
                {!hideScore && (
                <select
                  aria-label={"RIR Satz " + (si + 1)}
                  title="RIR / Score je Satz"
                  className="h-[22px] w-full appearance-none rounded-[8px] bg-transparent px-1 py-0 text-center font-mono text-[15px] leading-[22px] text-foreground outline-none [text-align-last:center] focus:bg-muted/70"
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
                )}
                {!editMode && (
                  <SetCheck
                    done={st.done}
                    active={act}
                    onToggle={() => onToggleSet(si)}
                    ariaLabel={"Satz " + (si + 1) + " abhaken"}
                  />
                )}
              </div>
              {chips(st.weight, false, si, st.done)}
            </div>
          );
        })}

        <div className="px-1.5 pb-1 pt-4">
          {onNote ? (
            <NoteBlock
              value={entry.note}
              onChange={onNote}
              compact
              placeholder="Was ist bei dieser Übung passiert?"
              actions={setButtons}
            />
          ) : (
            <div className="flex items-center gap-4">{setButtons}</div>
          )}
        </div>
      </div>
    </div>
  );
}
