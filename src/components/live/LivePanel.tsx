import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useLiveClock } from "./useLiveClock";
import { useGripDrag } from "./useGripDrag";
import { LiveMiniBar } from "./LiveMiniBar";
import type { LiveSession } from "@/lib/liveSession";

// Globales Live-Panel der gefuehrten Session (Phase 11, Lieferung 1: die Huelle).
//  - Desktop (>= 960px): Vollbild-Overlay; eingeklappt eine freischwebende Pille.
//  - Mobile (< 960px): EIN morphendes Bodenblatt - eingeklappt schiebt sich
//    dasselbe Element zum dunklen Mini-Streifen ueber der Navigation; Ziehen am
//    Griff/Kopf klappt auf und zu.
// Der Inhalt ist hier noch ein Platzhalter; die echten Uebungs-/Satzkarten kommen
// mit Lieferung 2.

function PanelContent({ session }: { session: LiveSession }): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[14px] bg-card p-4 text-[13px] text-muted-foreground shadow-card">
        Die gefuehrten Uebungs- und Satzkarten folgen in Lieferung 2. Hier
        laufen bereits Kopf, Uhr, Ein-/Ausklappen und die Start-/Ende-Dialoge.
      </div>
      {session.exercisesPreview.length > 0 && (
        <div className="overflow-hidden rounded-[14px] bg-card shadow-card">
          {session.exercisesPreview.map((name, i) => (
            <div
              key={name + i}
              className="border-border px-4 py-3 text-[15px] font-medium text-foreground [&:not(:last-child)]:border-b"
            >
              {name}
            </div>
          ))}
        </div>
      )}
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
  const ovRef = useRef<HTMLDivElement>(null);
  const startedAt = live.session?.startedAt ?? null;
  const clock = useLiveClock(startedAt);

  // Ziehgeste nur am Handy; bei Desktop deaktiviert.
  useGripDrag(ovRef, live.collapsed, live.setCollapsed, !isDesktop && !!live.session);

  if (!live.session) return null;
  const s = live.session;
  const title = "Workout " + s.title;
  const subtitle =
    s.exercisesPreview.length > 0
      ? s.exercisesPreview.length + " Übungen"
      : "läuft";

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
            <PanelContent session={s} />
          </div>
        </div>
      </div>
    );
  }

  // --- Mobile: ein morphendes Element ---
  const cls =
    "kl-ov kl-ov--mob" +
    (live.collapsed ? " is-collapsed" : "") +
    (live.entering ? " is-entering" : "");
  return (
    <div
      ref={ovRef}
      className={cls}
      onAnimationEnd={live.clearEntering}
    >
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
        <PanelContent session={s} />
      </div>
    </div>
  );
}
