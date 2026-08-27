import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEnterExit } from "@/hooks/useEnterExit";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

// Wiederverwendbares Popup-Fundament (1:1 aus dem V1-Verhalten abgeleitet:
// Yoga-Eintrag, Workout-Start, Sitzungsende, Login). Ein einziger Baustein fuer
// alle modalen Dialoge:
//   - Desktop (>= 960px): zentriertes Fenster (feste Breite, weicher Schatten),
//     sanftes Ein-/Ausblenden.
//   - Mobile (< 960px): von unten hereinfahrendes Bodenblatt mit Greif-Leiste,
//     volle Breite, oben abgerundet.
// Schliessen per Hintergrundklick, X im Kopf oder Escape. Solange offen, wird
// der Hintergrund gegen Scrollen gesperrt. Das Reinfahren/Rausfahren laeuft per
// CSS-Transition; das Aushaengen aus dem DOM ist bis zum Ende der Ausblende-
// Animation verzoegert (kein Springen). Gerendert wird per Portal an <body>,
// damit das Overlay ueber allem liegt, unabhaengig vom Aufrufort.
//
// Bewusst generisch und domaenenfrei: Titel + Inhalt kommen vom Aufrufer. Der
// primaere Aktionsknopf und ein mobiles "Abbrechen" gehoeren in den Inhalt, weil
// sie je Dialog unterschiedlich sind. Das gilt weiter fuer die Mehrheit: die
// Bestandsaufnahme zu Issue #399 hat unter den 16 Dialogen hier drei
// Fussleisten-Familien gefunden, sechs davon haben gar keine. Wo die Leiste sich
// doch wiederholt - Abbrechen schmal neben breitem Primaerknopf, drei Dialoge -
// nimmt sie der Baustein ui/dialog-footer.tsx auf, der neben dem Overlay steht
// statt darin. Deshalb gibt es hier bewusst keinen footer-Slot: er wuerde den
// uebrigen 13 einen ungenutzten Anbau aufdruecken.

const EXIT_MS = 320; // muss zur laengsten Transition unten passen

export function Overlay({
  open,
  onClose,
  title,
  headerTrailing,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Optionales Element im Kopf, zwischen Titel und Schliessen-Knopf
   *  (z. B. der laufende Uhr-Chip im Sitzungsende-Dialog). */
  headerTrailing?: ReactNode;
  children: ReactNode;
  className?: string;
}): React.ReactElement | null {
  // Ein-/Ausfahren samt verzoegertem Aushaengen kommt aus dem gemeinsamen Hook
  // (mounted = im DOM, shown = sichtbarer Endzustand, Reflow gegen das
  // Zusammenfassen der Frames auf iOS).
  const { mounted, shown, rootRef } = useEnterExit(open, EXIT_MS);

  // Escape schliesst.
  useEffect(() => {
    if (!mounted) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  // Seite dahinter stilllegen, solange das Overlay im DOM ist (iOS-fest, zaehlt
  // verschachtelte Sperren mit - etwa Popup ueber laufendem Live-Panel).
  useScrollLock(mounted);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className={cn(
        "fixed inset-0 z-[95] flex items-end justify-center transition-colors duration-300 min-[960px]:items-center min-[960px]:p-8",
        shown ? "bg-[rgba(20,24,40,0.42)]" : "bg-[rgba(20,24,40,0)]",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90%] w-full flex-col overflow-x-hidden overflow-y-auto bg-background",
          "rounded-t-[26px] px-[22px] pt-3.5 pb-[max(22px,env(safe-area-inset-bottom))]",
          "shadow-pop will-change-transform",
          "transition-[transform,translate,scale,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          // Desktop: zentriertes Fenster statt Bodenblatt.
          "min-[960px]:max-h-[88vh] min-[960px]:w-[440px] min-[960px]:rounded-[22px] min-[960px]:px-[26px] min-[960px]:pt-[26px] min-[960px]:pb-6",
          shown
            ? "translate-y-0 opacity-100 min-[960px]:scale-100"
            : "translate-y-full opacity-0 min-[960px]:translate-y-1 min-[960px]:scale-[0.98]",
          className,
        )}
      >
        {/* Greif-Leiste nur am Handy. */}
        <div className="mx-auto mb-3.5 h-[5px] w-[38px] flex-none rounded-[3px] bg-marker-idle min-[960px]:hidden" />

        {title != null && (
          <div className="mb-[18px] flex flex-none items-center gap-3">
            <div className="flex-1 text-[20px] font-bold text-foreground">
              {title}
            </div>
            {headerTrailing}
            <button
              type="button"
              aria-label="Schliessen"
              onClick={onClose}
              className="flex size-7 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-[18px]" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}
