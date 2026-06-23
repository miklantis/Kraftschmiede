import { useEffect, type RefObject } from "react";

// Ziehgeste am Griff des mobilen Live-Panels - 1:1 aus V1 (live.js
// bindLiveGripDrag). Das Overlay folgt dem Finger zwischen aufgeklappt (0) und
// eingeklappt (Mini-Offset); beim Loslassen schnappt es per CSS-Transition. Nur
// ein echter Zug aendert den Zustand, reines Tippen nicht.
//
// Waehrend des Ziehens wird `transform` direkt am Element gesetzt (kein Re-
// Render). Erst beim Loslassen meldet der Hook den Zielzustand ueber onSnap an
// den Store; React setzt dann die Klasse, und die CSS-Transition uebernimmt.

const SNAP_THRESHOLD = 60; // Mindest-Ziehweite, um den Zustand zu wechseln

/** Sichtbare Hoehe von Griff + Kopf im eingeklappten Zustand. */
function headHeight(ov: HTMLElement): number {
  const grip = ov.querySelector<HTMLElement>(".kl-ov-grip");
  const head = ov.querySelector<HTMLElement>(".kl-ov-head");
  const gh = grip ? grip.getBoundingClientRect().height : 0;
  const hh = head ? head.getBoundingClientRect().height : 0;
  return Math.round(gh + hh);
}

/**
 * Verschiebeweg zwischen aufgeklappt und eingeklappt. Im eingeklappten Zustand
 * ist das Element bereits verschoben, daher die Klasse fuer die Messung kurz
 * entfernen (kein Repaint sichtbar, da synchron).
 */
function collapseOffset(ov: HTMLElement): number {
  const wasCollapsed = ov.classList.contains("is-collapsed");
  if (wasCollapsed) {
    ov.style.transition = "none";
    ov.classList.remove("is-collapsed");
  }
  const topNow = ov.getBoundingClientRect().top;
  if (wasCollapsed) ov.classList.add("is-collapsed");
  const nav = document.querySelector<HTMLElement>(".ks-botnav");
  const navH = nav ? nav.getBoundingClientRect().height : 0;
  const headH = headHeight(ov);
  const vh = window.innerHeight;
  return Math.max(0, vh - navH - headH - topNow);
}

export function useGripDrag(
  ovRef: RefObject<HTMLDivElement | null>,
  collapsed: boolean,
  onSnap: (collapsed: boolean) => void,
  enabled: boolean,
): void {
  // Kopfhoehe einmalig festschreiben, sobald das mobile Panel existiert. Frisch
  // eingehaengt traegt --ks-livehead-h noch nicht inline; das CSS faellt sonst
  // auf einen Naeherungswert zurueck und der eingeklappte Streifen zuckt. Bewusst
  // NICHT bei jedem Ein-/Ausklappen erneut (der Transition-Reset wuerde sonst die
  // Morph-Animation unterbrechen) - die Kopfhoehe ist ohnehin konstant.
  useEffect(() => {
    const ov = ovRef.current;
    if (!ov || !enabled) return;
    ov.style.transition = "none";
    ov.style.setProperty("--ks-livehead-h", headHeight(ov) + "px");
    void ov.offsetHeight;
    ov.style.transition = "";
  }, [ovRef, enabled]);

  useEffect(() => {
    const ov = ovRef.current;
    if (!ov || !enabled) return undefined;

    const handles = Array.from(
      ov.querySelectorAll<HTMLElement>("[data-live-grip]"),
    );
    if (!handles.length) return undefined;

    let startY = 0;
    let dy = 0;
    let base = 0;
    let off = 0;
    let dragging = false;

    function onDown(e: PointerEvent): void {
      // Beenden/Einklappen bleiben echte Buttons -> von dort kein Drag starten.
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      const el = ov as HTMLElement;
      dragging = true;
      dy = 0;
      startY = e.clientY;
      off = collapseOffset(el);
      base = collapsed ? off : 0;
      el.style.transition = "none";
      el.classList.add("is-dragging");
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Pointer-Capture optional
      }
    }

    function onMove(e: PointerEvent): void {
      if (!dragging) return;
      dy = e.clientY - startY;
      const y = Math.min(off, Math.max(0, base + dy));
      (ov as HTMLElement).style.transform = "translateY(" + y + "px)";
    }

    function onUp(): void {
      if (!dragging) return;
      dragging = false;
      const el = ov as HTMLElement;
      el.style.transition = "";
      el.style.transform = "";
      el.classList.remove("is-dragging");
      // Nur Ziehen aendert den Zustand; reines Tippen laesst ihn, wie er ist.
      let nowCollapsed: boolean;
      if (!collapsed) nowCollapsed = dy > SNAP_THRESHOLD;
      else nowCollapsed = !(dy < -SNAP_THRESHOLD);
      onSnap(nowCollapsed);
    }

    for (const h of handles) {
      h.addEventListener("pointerdown", onDown);
      h.addEventListener("pointermove", onMove);
      h.addEventListener("pointerup", onUp);
      h.addEventListener("pointercancel", onUp);
    }
    return () => {
      for (const h of handles) {
        h.removeEventListener("pointerdown", onDown);
        h.removeEventListener("pointermove", onMove);
        h.removeEventListener("pointerup", onUp);
        h.removeEventListener("pointercancel", onUp);
      }
    };
  }, [ovRef, collapsed, onSnap, enabled]);
}
