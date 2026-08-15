import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useLiveSession, type UseLiveSession } from "@/hooks/useLiveSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePlates, useBars } from "@/hooks/useInventory";
import { useSettings } from "@/hooks/useSettings";
import { computeActive, progressInfo } from "@/lib/liveFlow";
import type {
  WorkoutSession,
  RmTestSession,
  SkillSession,
  SkillLiveExercise,
} from "@/lib/liveSession";
import { testResult, asRmFormula } from "@/lib/rmTest";
import { fmtWeight } from "@/lib/format";
import type { RmFormula } from "@/engine/types";
import { useLiveClock } from "./useLiveClock";
import { useGripDrag } from "./useGripDrag";
import { LiveMiniBar } from "./LiveMiniBar";
import { GeneralWarmupCard } from "./GeneralWarmupCard";
import { LoadNoteBanner } from "./LoadNoteBanner";
import { ExerciseLiveCard } from "./ExerciseLiveCard";
import { SkillLiveCard } from "./SkillLiveCard";
import { RestBar } from "./RestBar";
import { DurationTimerOverlay } from "./DurationTimerOverlay";
import { NoteBlock } from "@/components/ui/note-block";

// Globales Live-Panel der gefuehrten Session.
//  - Desktop (>= 960px): Vollbild-Overlay; eingeklappt eine freischwebende Pille.
//  - Mobile (< 960px): EIN morphendes Bodenblatt - eingeklappt schiebt sich
//    dasselbe Element zum dunklen Mini-Streifen ueber der Navigation.
// Lieferung 3: die Karten sind interaktiv (abhaken, Werte tippen, Stange,
// Scheiben, +/-), der aktive Satz ist hervorgehoben, nach einem abgehakten
// Arbeitssatz startet die Auto-Pause (Pausen-Leiste unten).

function PanelContent({
  session,
  live,
  plates,
  bars,
  unit,
}: {
  session: WorkoutSession;
  live: UseLiveSession;
  plates: number[];
  bars: { id: string; name: string; weight: number }[];
  unit: string;
}): React.ReactElement {
  const active = computeActive(session.entries, session.focusEi);
  return (
    <div className="flex flex-col gap-3">
      {session.loadNote !== null && <LoadNoteBanner text={session.loadNote} />}
      <GeneralWarmupCard
        sets={session.generalWarmup.sets}
        onToggle={live.toggleGeneralWarmup}
        onMinutes={live.commitGeneralWarmupMinutes}
        onMode={live.setGeneralWarmupMode}
        onAdd={live.addGeneralWarmup}
        onDel={live.delGeneralWarmup}
      />
      {session.entries.map((entry, i) => (
        <ExerciseLiveCard
          key={entry.exerciseId + i}
          entry={entry}
          ei={i}
          active={active}
          plateMode={live.plateShow[i] ?? 0}
          plates={plates}
          bars={bars}
          unit={unit}
          onToggleWarm={(wi) => live.toggleWarmSet(i, wi)}
          onToggleSet={(si) => live.toggleWorkSet(i, si)}
          onWarmValue={(wi, kind, v) => live.commitWarmupValue(i, wi, kind, v)}
          onSetValue={(si, kind, v) => live.commitSetValue(i, si, kind, v)}
          onAddSet={() => live.addSet(i)}
          onDelSet={() => live.delSet(i)}
          onChangeBar={(bar) => live.changeBar(i, bar)}
          onCyclePlate={() => live.cyclePlateMode(i)}
          onNote={(note) => live.setEntryNote(i, note)}
        />
      ))}
      <div className="rounded-[14px] bg-card px-4 py-3 shadow-card">
        <NoteBlock
          value={session.note}
          onChange={live.setSessionNote}
          label="Notiz zur Einheit"
          placeholder="Wie lief das Training?"
        />
      </div>
    </div>
  );
}

/** Inhalt des 1RM-Tests: allgemeines Aufwaermen wie beim Workout, darunter die
 *  eine getestete Uebung in der vertrauten Satz-Karte (ohne RIR-Spalte, ohne
 *  Aufwaermsaetze) und die Vorschau „altes → neues 1RM“, sobald ein Satz
 *  abgehakt ist. */
function RmTestPanelContent({
  session,
  live,
  plates,
  bars,
  unit,
  formula,
}: {
  session: RmTestSession;
  live: UseLiveSession;
  plates: number[];
  bars: { id: string; name: string; weight: number }[];
  unit: string;
  formula: RmFormula;
}): React.ReactElement {
  const active = computeActive(session.entries, session.focusEi);
  const entry = session.entries[0];
  const result = testResult(
    (entry?.sets ?? []).map((x) => ({
      reps: x.reps,
      weight: x.weight,
      done: x.done,
    })),
    formula,
  );
  return (
    <div className="flex flex-col gap-3">
      <GeneralWarmupCard
        sets={session.generalWarmup.sets}
        onToggle={live.toggleGeneralWarmup}
        onMinutes={live.commitGeneralWarmupMinutes}
        onMode={live.setGeneralWarmupMode}
        onAdd={live.addGeneralWarmup}
        onDel={live.delGeneralWarmup}
      />
      {entry && (
        <ExerciseLiveCard
          entry={entry}
          ei={0}
          active={active}
          plateMode={live.plateShow[0] ?? 0}
          plates={plates}
          bars={bars}
          unit={unit}
          onToggleWarm={() => {}}
          onToggleSet={(si) => live.toggleWorkSet(0, si)}
          onWarmValue={() => {}}
          onSetValue={(si, kind, v) => live.commitSetValue(0, si, kind, v)}
          onAddSet={() => live.addSet(0)}
          onDelSet={() => live.delSet(0)}
          onChangeBar={(bar) => live.changeBar(0, bar)}
          onCyclePlate={() => live.cyclePlateMode(0)}
          hideScore
        />
      )}
      <div className="rounded-[14px] bg-card p-4 shadow-card">
        <div className="text-[12px] font-semibold tracking-[0.3px] text-muted-foreground uppercase">
          {result.estRm == null ? "Aktuelles 1RM" : "1RM"}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-2 font-mono text-[20px] font-semibold tabular-nums">
          <span
            className={
              result.estRm == null ? "text-foreground" : "text-muted-foreground"
            }
          >
            {session.previousRm != null
              ? fmtWeight(session.previousRm, unit)
              : "–"}
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
        {result.estRm == null ? (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Dein aktueller Wert. Hak einen Satz ab (höchstens 5
            Wiederholungen), dann steht rechts daneben der neue.
          </p>
        ) : (
          result.best && (
            <div className="mt-1 font-mono text-[13px] text-muted-foreground tabular-nums">
              bester Satz {fmtWeight(result.best.weight, unit)} ×{" "}
              {result.best.reps}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SkillPanelContent({
  session,
  live,
}: {
  session: SkillSession;
  live: UseLiveSession;
}): React.ReactElement {
  const watch = live.skillWatch;
  return (
    <div className="flex flex-col gap-3">
      {session.mastered && (
        <div className="rounded-[14px] border border-skill/30 bg-skill/10 px-4 py-3 text-[14px] font-medium text-foreground">
          Skill gemeistert – Erhaltungstraining der letzten Phase.
        </div>
      )}
      {session.exercises.map((ex, i) => (
        <SkillLiveCard
          key={ex.name + i}
          exercise={ex}
          watchSi={watch && watch.ei === i ? watch.si : null}
          onToggleSet={(si) => live.toggleSkillSet(i, si)}
          onValue={(si, v) => live.commitSkillValue(i, si, v)}
          onStartWatch={(si) => live.startSkillWatch(i, si)}
          onStopWatch={live.stopSkillWatch}
          onNote={(note) => live.setSkillNote(i, note)}
        />
      ))}
      <div className="rounded-[14px] bg-card px-4 py-3 shadow-card">
        <NoteBlock
          value={session.note}
          onChange={live.setSessionNote}
          label="Notiz zur Einheit"
          placeholder="Wie lief das Training?"
        />
      </div>
    </div>
  );
}

/** Fortschritt der Skill-Einheit fuer Kopf/Mini-Streifen. */
function skillProgressInfo(exercises: SkillLiveExercise[]): {
  curLabel: string;
  progress: string;
} {
  const total = exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  let idx = exercises.findIndex((e) => e.sets.some((s) => !s.done));
  if (idx < 0) idx = Math.max(0, exercises.length - 1);
  return {
    curLabel: "Übung " + (idx + 1) + " von " + exercises.length,
    progress: done + " / " + total + " Sätze",
  };
}

function PanelHead({
  title,
  clock,
  onCollapse,
  onEnd,
  grip,
}: {
  title: string;
  clock: string;
  onCollapse: () => void;
  onEnd: () => void;
  grip: boolean;
}): React.ReactElement {
  return (
    <div className="kl-ov-head" {...(grip ? { "data-live-grip": "" } : {})}>
      <button
        type="button"
        aria-label="Panel einklappen"
        className="kl-ov-collapse"
        onClick={onCollapse}
      >
        <ChevronDown className="size-[18px]" strokeWidth={2.2} />
      </button>
      <div className="kl-ov-info">
        <div className="kl-ov-info-title">{title}</div>
      </div>
      <div className="kl-ov-clockchip">
        <span className="kl-ov-clockdot" />
        <span className="kl-ov-clock">{clock}</span>
      </div>
      <button type="button" className="kl-ov-end" onClick={onEnd}>
        Beenden
      </button>
    </div>
  );
}

export function LivePanel(): React.ReactElement | null {
  const live = useLiveSession();
  const isDesktop = useIsDesktop();
  const platesQ = usePlates();
  const barsQ = useBars();
  const settingsQ = useSettings();
  const ovRef = useRef<HTMLDivElement>(null);
  const startedAt = live.session?.startedAt ?? null;
  const clock = useLiveClock(startedAt);

  // Timer-/Ton-Einstellungen in den Live-Store spiegeln (Abhaken/Pause lesen sie).
  const timers = settingsQ.data?.timers;
  const syncPrefs = live.syncPrefs;
  useEffect(() => {
    if (timers) syncPrefs(timers);
  }, [timers, syncPrefs]);

  // Ziehgeste nur am Handy; bei Desktop deaktiviert.
  useGripDrag(ovRef, live.collapsed, live.setCollapsed, !isDesktop && !!live.session);

  if (!live.session) return null;
  const s = live.session;
  const plates = (platesQ.data ?? []).map((p) => p.weight);
  const bars = (barsQ.data ?? []).map((b) => ({ id: b.id, name: b.name, weight: b.weight }));
  const unit = settingsQ.data?.unit ?? "kg";
  const audioPrefs = {
    sound: timers?.sound ?? true,
    vibrate: timers?.vibrate ?? true,
  };
  const isSkill = s.kind === "skill";
  const title = isSkill ? "Skill " + s.title : s.title;
  const prog =
    s.kind === "skill"
      ? skillProgressInfo(s.exercises)
      : progressInfo(s.entries, s.focusEi);
  const exCount = s.kind === "skill" ? s.exercises.length : s.entries.length;
  const subtitle =
    s.kind === "rmtest"
      ? prog.progress
      : exCount > 0
        ? prog.curLabel + " · " + prog.progress
        : "läuft";
  const formula = asRmFormula(settingsQ.data?.rm_formula);
  const content =
    s.kind === "skill" ? (
      <SkillPanelContent session={s} live={live} />
    ) : s.kind === "rmtest" ? (
      <RmTestPanelContent
        session={s}
        live={live}
        plates={plates}
        bars={bars}
        unit={unit}
        formula={formula}
      />
    ) : (
      <PanelContent session={s} live={live} plates={plates} bars={bars} unit={unit} />
    );

  // Die Leiste bleibt gemountet und faehrt selbst herein/heraus; null als
  // Endzeit heisst "zu" (kein Rest oder Panel eingeklappt).
  const restBar = (
    <RestBar
      endsAt={live.rest && !live.collapsed ? live.rest.endsAt : null}
      audioPrefs={audioPrefs}
      isDesktop={isDesktop}
      onAdjust={live.adjustRest}
      onSkip={live.skipRest}
    />
  );

  // Grosse Timer-Ansicht der Dauer-Uebungen: haengt an derselben Stelle wie die
  // Pausen-Leiste, liegt aber als eigene Schicht ueber allem (Portal).
  const watchEx =
    s.kind === "skill" && live.skillWatch ? s.exercises[live.skillWatch.ei] : undefined;
  const durationTimer =
    live.skillWatch && watchEx ? (
      <DurationTimerOverlay
        key={live.skillWatch.ei + "-" + live.skillWatch.si}
        exerciseName={watchEx.name}
        setLabel={"Satz " + (live.skillWatch.si + 1) + " von " + watchEx.sets.length}
        target={watchEx.target}
        baseValue={watchEx.sets[live.skillWatch.si]?.value ?? 0}
        audioPrefs={audioPrefs}
        onEnd={(sec) => {
          const w = live.skillWatch;
          if (w) live.commitSkillValue(w.ei, w.si, sec);
          live.stopSkillWatch();
        }}
      />
    ) : null;

  // --- Desktop ---
  if (isDesktop) {
    if (live.collapsed) {
      return (
        <>
          <LiveMiniBar
            title={title + " läuft"}
            subtitle={subtitle}
            clock={clock}
            onExpand={live.expand}
          />
          {restBar}
          {durationTimer}
        </>
      );
    }
    return (
      <div className="kl-ov kl-ov--desk">
        <PanelHead
          title={title}
          clock={clock}
          onCollapse={live.collapse}
          onEnd={live.requestEnd}
          grip={false}
        />
        <div className="kl-ov-scroll">
          <div className="kl-ov-inner">{content}</div>
        </div>
        {restBar}
        {durationTimer}
      </div>
    );
  }

  // --- Mobile: ein morphendes Element ---
  const cls =
    "kl-ov kl-ov--mob" +
    (live.collapsed ? " is-collapsed" : "") +
    (live.entering ? " is-entering" : "");
  return (
    <>
      <div ref={ovRef} className={cls} onAnimationEnd={live.clearEntering}>
        <div className="kl-ov-grip" data-live-grip="">
          <div className="kl-ov-grip-bar" />
        </div>
        <PanelHead
          title={title}
          clock={clock}
          onCollapse={live.collapse}
          onEnd={live.requestEnd}
          grip
        />
        <div className="kl-ov-scroll">{content}</div>
      </div>
      {restBar}
      {durationTimer}
    </>
  );
}
