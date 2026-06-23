import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useLiveSession, type UseLiveSession } from "@/hooks/useLiveSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { usePlates, useBars } from "@/hooks/useInventory";
import { useSettings } from "@/hooks/useSettings";
import { computeActive, progressInfo } from "@/lib/liveFlow";
import type { LiveSession } from "@/lib/liveSession";
import { useLiveClock } from "./useLiveClock";
import { useGripDrag } from "./useGripDrag";
import { LiveMiniBar } from "./LiveMiniBar";
import { GeneralWarmupCard } from "./GeneralWarmupCard";
import { ExerciseLiveCard } from "./ExerciseLiveCard";
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
  session: LiveSession;
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
  const title = "Workout " + s.title;
  const prog = progressInfo(s.entries);
  const subtitle = prog.exCount > 0 ? prog.curLabel + " · " + prog.progress : "läuft";

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
          <div className="kl-ov-inner">
            <PanelContent session={s} live={live} plates={plates} bars={bars} unit={unit} />
          </div>
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
        <div className="kl-ov-scroll">
          <PanelContent session={s} live={live} plates={plates} bars={bars} unit={unit} />
        </div>
      </div>
      {restBar}
    </>
  );
}
