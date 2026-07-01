import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useLiveSession, type UseLiveSession } from "@/hooks/useLiveSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePlates, useBars } from "@/hooks/useInventory";
import { useSettings } from "@/hooks/useSettings";
import { computeActive, progressInfo } from "@/lib/liveFlow";
import type {
  WorkoutSession,
  SkillSession,
  SkillLiveExercise,
} from "@/lib/liveSession";
import type { AudioPrefs } from "@/lib/liveAudio";
import { useLiveClock } from "./useLiveClock";
import { useGripDrag } from "./useGripDrag";
import { LiveMiniBar } from "./LiveMiniBar";
import { GeneralWarmupCard } from "./GeneralWarmupCard";
import { ExerciseLiveCard } from "./ExerciseLiveCard";
import { SkillLiveCard } from "./SkillLiveCard";
import { RestBar } from "./RestBar";

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
  const active = computeActive(session.entries);
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
        />
      ))}
    </div>
  );
}

function SkillPanelContent({
  session,
  live,
  audioPrefs,
}: {
  session: SkillSession;
  live: UseLiveSession;
  audioPrefs: AudioPrefs;
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
          audioPrefs={audioPrefs}
          onToggleSet={(si) => live.toggleSkillSet(i, si)}
          onValue={(si, v) => live.commitSkillValue(i, si, v)}
          onStartWatch={(si) => live.startSkillWatch(i, si)}
          onStopWatch={live.stopSkillWatch}
        />
      ))}
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
  const prog = s.kind === "skill" ? skillProgressInfo(s.exercises) : progressInfo(s.entries);
  const exCount = s.kind === "skill" ? s.exercises.length : s.entries.length;
  const subtitle = exCount > 0 ? prog.curLabel + " · " + prog.progress : "läuft";
  const content = s.kind === "skill" ? (
    <SkillPanelContent session={s} live={live} audioPrefs={audioPrefs} />
  ) : (
    <PanelContent session={s} live={live} plates={plates} bars={bars} unit={unit} />
  );

  const restBar =
    live.rest && !live.collapsed ? (
      <RestBar
        endsAt={live.rest.endsAt}
        audioPrefs={audioPrefs}
        isDesktop={isDesktop}
        onAdjust={live.adjustRest}
        onSkip={live.skipRest}
      />
    ) : null;

  // --- Desktop ---
  if (isDesktop) {
    if (live.collapsed) {
      return (
        <LiveMiniBar
          title={title + " läuft"}
          subtitle={subtitle}
          clock={clock}
          onExpand={live.expand}
        />
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
    </>
  );
}
