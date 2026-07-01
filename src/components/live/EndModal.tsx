import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useFinishSession } from "@/hooks/useFinishSession";
import { useFinishSkill } from "@/hooks/useFinishSkill";
import { liveEndSummary } from "@/lib/liveFinish";
import { skillEndSummary } from "@/lib/skillFinish";
import type { SkillSession, WorkoutSession } from "@/lib/liveSession";
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
                      : "bg-secondary text-muted-foreground")
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
      {s && (s.kind === "skill" ? <SkillEnd s={s} /> : <WorkoutEnd s={s} />)}
    </Overlay>
  );
}
