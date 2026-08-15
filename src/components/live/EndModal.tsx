import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useFinishSession } from "@/hooks/useFinishSession";
import { useFinishSkill } from "@/hooks/useFinishSkill";
import { liveEndSummary } from "@/lib/liveFinish";
import { skillEndSummary } from "@/lib/skillFinish";
import type {
  RmTestSession,
  SkillSession,
  WorkoutSession,
} from "@/lib/liveSession";
import { useRmTestActions } from "@/hooks/useRmTestActions";
import { useSettings } from "@/hooks/useSettings";
import { asRmFormula, testResult } from "@/lib/rmTest";
import { todayISO, fmtWeight } from "@/lib/format";
import { useLiveClock } from "./useLiveClock";

// Ende-Popup, Optik 1:1 wie V1 (live.js buildEndInner / klar-app.css kl-end-*):
// gruener Uhr-Chip im Kopf neben dem X, je Uebung eine weisse Karte mit Schatten
// (Name links, "erledigt / gesamt" rechts) und den Saetzen als Chips - erledigte
// gruen, offene grau; gleicher Hinweistext und gleiche Knoepfe fuer Workout und
// Skill. "Speichern" schreibt nur die abgehakten Saetze in den Verlauf (bei
// fehlendem Netz pausiert und spaeter nachgeholt) und raeumt die Einheit lokal;
// beim Skill wird zusaetzlich der Fortschritt fortgeschrieben. "Verwerfen" raeumt
// nur lokal.

interface SummaryEntry {
  name: string;
  count: string;
  chips: { label: string; done: boolean }[];
}

function ClockChip({ clock }: { clock: string }): React.ReactElement {
  return (
    <span className="flex flex-none items-center gap-1.5 rounded-[18px] bg-primary/12 px-[13px] py-[7px]">
      <span className="size-[7px] rounded-full bg-primary" />
      <span className="font-mono text-[15px] font-semibold text-primary">{clock}</span>
    </span>
  );
}

function SummaryList({ entries }: { entries: SummaryEntry[] }): React.ReactElement {
  return (
    <div className="mb-3.5 flex flex-col gap-2.5">
      {entries.map((e, i) => (
        <div key={e.name + i} className="rounded-[14px] bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-foreground">{e.name}</span>
            <span className="font-mono text-[12px] font-semibold text-muted-foreground">
              {e.count}
            </span>
          </div>
          {e.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {e.chips.map((c, j) => (
                <span
                  key={j}
                  className={
                    "whitespace-nowrap rounded-[7px] px-[9px] py-1 font-mono text-[12px] font-semibold " +
                    (c.done
                      ? "bg-primary/12 text-primary"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SaveDiscard({
  onSave,
  onDiscard,
  isSaving,
}: {
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}): React.ReactElement {
  return (
    <>
      <div className="mb-3.5 text-center text-xs text-muted-foreground">
        Speichern übernimmt nur erledigte Sätze in den Verlauf.
      </div>
      <Button
        onClick={onSave}
        disabled={isSaving}
        className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Speichern
      </Button>
      <Button
        variant="destructive"
        onClick={onDiscard}
        className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Verwerfen
      </Button>
    </>
  );
}

function WorkoutEnd({ s }: { s: WorkoutSession }): React.ReactElement {
  const live = useLiveSession();
  const { finishWorkout, isSaving } = useFinishSession();
  const entries: SummaryEntry[] = liveEndSummary(s).map((e) => ({
    name: e.name,
    count: e.count,
    chips: e.chips,
  }));
  function onSave(): void {
    finishWorkout(s);
    live.clear();
  }
  return (
    <>
      <SummaryList entries={entries} />
      <SaveDiscard onSave={onSave} onDiscard={live.discard} isSaving={isSaving} />
    </>
  );
}

function SkillEnd({ s }: { s: SkillSession }): React.ReactElement {
  const live = useLiveSession();
  const { finishSkill, isSaving } = useFinishSkill();
  const summary = skillEndSummary(s, Date.now());
  const entries: SummaryEntry[] = summary.entries.map((e) => ({
    name: e.name,
    count: e.count,
    chips: e.chips,
  }));
  function onSave(): void {
    finishSkill(s);
    live.clear();
  }
  return (
    <>
      <SummaryList entries={entries} />
      <SaveDiscard onSave={onSave} onDiscard={live.discard} isSaving={isSaving} />
    </>
  );
}

/** Ende des 1RM-Tests: statt einer Einheit wird die Test-Zeile geschrieben und
 *  der Rekord der Uebung gesetzt - nach oben wie nach unten. Verwerfen laesst
 *  alles unberuehrt (kein Eintrag, Rekord bleibt), wie beim Workout. */
function RmTestEnd({ s }: { s: RmTestSession }): React.ReactElement {
  const live = useLiveSession();
  const settingsQ = useSettings();
  const { add, isPending } = useRmTestActions();
  const unit = settingsQ.data?.unit ?? "kg";
  const formula = asRmFormula(settingsQ.data?.rm_formula);
  const entry = s.entries[0];
  const sets = entry?.sets ?? [];
  const result = testResult(
    sets.map((x) => ({ reps: x.reps, weight: x.weight, done: x.done })),
    formula,
  );
  const entries: SummaryEntry[] = entry
    ? [
        {
          name: entry.exerciseName,
          count: sets.filter((x) => x.done).length + " / " + sets.length,
          chips: sets.map((x) => ({
            label: x.reps + " × " + x.weight,
            done: x.done,
          })),
        },
      ]
    : [];

  async function onSave(): Promise<void> {
    if (result.estRm == null || result.best == null) return;
    await add({
      exerciseId: s.exerciseId,
      date: todayISO(),
      weight: result.best.weight,
      reps: result.best.reps,
      estRm: result.estRm,
      previousRm: s.previousRm,
      // Die Notiz haengt beim Test an der einen Uebung und wandert von dort in
      // die Test-Zeile (rm_tests.notiz).
      notiz: entry?.note.trim() ?? "",
    });
    live.clear();
  }

  return (
    <>
      <SummaryList entries={entries} />
      <div className="mb-3.5 rounded-[14px] bg-card p-4 shadow-card">
        <div className="text-[12px] font-semibold tracking-[0.3px] text-muted-foreground uppercase">
          {result.estRm == null ? "Aktuelles 1RM" : "1RM"}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-2 font-mono text-[20px] font-semibold tabular-nums">
          <span
            className={
              result.estRm == null ? "text-foreground" : "text-muted-foreground"
            }
          >
            {s.previousRm != null ? fmtWeight(s.previousRm, unit) : "–"}
          </span>
          {result.estRm != null && (
            <>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground">
                {fmtWeight(result.estRm, unit)}
              </span>
            </>
          )}
        </div>
        {result.estRm == null && (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Kein abgehakter Satz mit höchstens 5 Wiederholungen – dein Wert
            bleibt, wie er ist.
          </p>
        )}
      </div>
      <div className="mb-3.5 text-center text-xs text-muted-foreground">
        Speichern setzt dein 1RM auf den Testwert und legt den Test ab.
      </div>
      <Button
        onClick={() => void onSave()}
        disabled={isPending || result.estRm == null}
        className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Speichern
      </Button>
      <Button
        variant="destructive"
        onClick={live.discard}
        className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
      >
        Verwerfen
      </Button>
    </>
  );
}

export function EndModal(): React.ReactElement {
  const live = useLiveSession();
  const s = live.session;
  const open = live.ending && s != null;
  const clock = useLiveClock(open && s ? s.startedAt : null);
  const isSkill = s?.kind === "skill";

  return (
    <Overlay
      open={open}
      onClose={live.closeEnd}
      title={s ? (isSkill ? "Skill " + s.title : s.title) + " beenden" : undefined}
      headerTrailing={open ? <ClockChip clock={clock} /> : undefined}
    >
      {s &&
        (s.kind === "skill" ? (
          <SkillEnd s={s} />
        ) : s.kind === "rmtest" ? (
          <RmTestEnd s={s} />
        ) : (
          <WorkoutEnd s={s} />
        ))}
    </Overlay>
  );
}
