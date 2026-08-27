import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

// Fussleiste der Bearbeiten-Dialoge: links der schmale Abbrechen-Knopf, rechts
// der breite Primaerknopf. Nach dem Speichern tritt an ihre Stelle der gruene
// Erfolgsbalken, danach schliesst der Dialog von selbst. Stand vorher dreimal
// zeichengleich im Repo (Issue #406).
//
// Benutzt von ExerciseEditModal, MilestoneEditModal und
// MetricMilestoneEditModal. Bewusst NICHT von den uebrigen Overlay-Dialogen:
// die Bestandsaufnahme zu #399 hat drei Fussleisten-Familien gefunden, und die
// hier ist die seltenste. Die fuenf Dialoge der zweiten Familie (Messung,
// Zeitraum, Workout-Start, Yoga, Einheit bearbeiten) setzen den Primaerknopf
// ueber die volle Breite und das Abbrechen als Textzeile darunter, nur am
// Handy; App-Reset und Daten-Ersetzen stellen zwei kleine Knoepfe rechtsbuendig.
// Sie hier mitzuziehen waere eine sichtbare Aenderung und ist deshalb
// ausgeschlossen. Dieser Baustein ist damit ein Angebot, keine Vorschrift.
//
// `overlay.tsx` bleibt unberuehrt: es traegt 16 Dialoge, von denen 13 diese
// Leiste nicht haben. Ein footer-Slot dort wuerde der Mehrheit einen
// ungenutzten Anbau aufdruecken.

const FEEDBACK_MS = 850; // wie lange der gruene Balken steht, bevor es zugeht

export function DialogFooter({
  saved,
  savedLabel,
  actionLabel,
  onAction,
  onClose,
  disabled = false,
  children,
}: {
  /** true nach erfolgreichem Speichern: statt der Leiste steht der Balken. */
  saved: boolean;
  /** Text im gruenen Balken, z. B. "Gespeichert" oder "Uebernommen". */
  savedLabel: string;
  /** Text des Primaerknopfs, z. B. "Speichern", "Anlegen", "Uebernehmen". */
  actionLabel: string;
  onAction: () => void;
  /** Schliesst den Dialog: hinter Abbrechen und hinter dem abgelaufenen Balken. */
  onClose: () => void;
  /** Sperrt nur den Primaerknopf; Abbrechen bleibt immer erreichbar. */
  disabled?: boolean;
  /** Steht unter der Leiste und nur solange nicht gespeichert wurde -
   *  in den Meilenstein-Dialogen der DeleteConfirmButton. */
  children?: ReactNode;
}): React.ReactElement {
  // onClose ueber eine Ablage, damit der Ablauf allein an `saved` haengt: sonst
  // wuerde jede neue Funktions-Identitaet vom Aufrufer die Uhr neu starten und
  // der Dialog bliebe stehen.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!saved) return undefined;
    const t = window.setTimeout(() => closeRef.current(), FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [saved]);

  if (saved) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground">
        <Check className="size-[17px]" strokeWidth={2.6} />
        {savedLabel}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex-none rounded-[13px] border border-border bg-card px-5 py-3.5 text-[15px] font-semibold text-foreground transition-[filter] hover:brightness-95"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="flex-1 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-50"
        >
          {actionLabel}
        </button>
      </div>
      {children}
    </>
  );
}
