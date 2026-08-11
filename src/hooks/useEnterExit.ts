import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Ein-/Ausfahren fuer Elemente, die kommen und gehen (Popups, Timer, Leisten).
// Zwei Stufen, damit auch das Verschwinden animiert werden kann:
//   mounted = im DOM (auch waehrend des Ausfahrens)
//   shown   = sichtbarer Endzustand (loest die Transition aus)
//
// Der Reflow-Trick vor dem Umschalten auf `shown` ist der Kern: ohne ihn fasst
// der Browser Start- und Endzustand in einem Frame zusammen und springt ohne
// Bewegung ans Ziel - das Element "taucht auf" statt reinzufahren. Auf iOS
// Safari ist genau das sonst der Regelfall. Dafuer muss `rootRef` am aeusseren
// Element des Aufrufers haengen.
//
// Herkunft: 1:1 aus dem Popup-Fundament (Overlay) herausgeloest, damit
// Popups, Pausen-Leiste und Timer-Ansicht dieselbe Bewegung teilen.

export interface EnterExit {
  /** Element im DOM lassen? Deckt das Ausfahren mit ab. */
  mounted: boolean;
  /** Sichtbarer Endzustand erreicht - Klassen darauf umschalten. */
  shown: boolean;
  /** Muss am aeusseren Element haengen (Reflow vor dem Reinfahren). */
  rootRef: RefObject<HTMLDivElement | null>;
}

/**
 * @param open   Soll das Element zu sehen sein?
 * @param exitMs Dauer der Ausfahr-Bewegung; erst danach wird ausgehaengt.
 *               Muss zur laengsten Transition im Aufrufer passen.
 */
export function useEnterExit(open: boolean, exitMs: number): EnterExit {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Mounten/Aushaengen am open-Zustand. Beim Schliessen erst ausblenden, dann
  // nach Ablauf der Bewegung aus dem DOM nehmen.
  useEffect(() => {
    if (open) {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setMounted(true);
      return undefined;
    }
    setShown(false);
    closeTimer.current = window.setTimeout(() => {
      setMounted(false);
      closeTimer.current = null;
    }, exitMs);
    return undefined;
  }, [open, exitMs]);

  // Aufraeumen, falls der Aufrufer waehrend des Ausfahrens verschwindet.
  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  // Reinfahren: erst wenn das Element frisch im DOM steht, den Startzustand per
  // erzwungenem Reflow materialisieren und dann auf sichtbar schalten.
  useLayoutEffect(() => {
    if (!open || !mounted) return undefined;
    if (rootRef.current) void rootRef.current.offsetHeight;
    const id = window.requestAnimationFrame(() => {
      if (open) setShown(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, mounted]);

  return { mounted, shown, rootRef };
}
