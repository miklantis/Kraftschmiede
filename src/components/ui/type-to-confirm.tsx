import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { typedConfirmMatches } from "@/lib/typedConfirm";

// Bestaetigung durch Abtippen: ein Overlay fuer Handgriffe, die nicht aus
// Versehen passieren duerfen (erstmals der Journey-Wechsel, Issue #257). Der
// Bestaetigen-Knopf bleibt gesperrt, bis das vorgegebene Wort zeichengenau
// getippt ist - Gross/Kleinschreibung und Umlaute inklusive, ohne Trimmen
// (lib/typedConfirm).
//
// Bewusst domaenenfrei: Titel, Erklaerung (children), Wort, Knopftext und
// Aktion kommen vom Aufrufer.
//
// Zwei Details, ohne die die Huerde nur Deko waere:
//   - Der ganze Dialog ist nicht markierbar (select-none), nur das Tippfeld
//     selbst (select-text). Sonst waere der Name einmal kopiert und eingefuegt
//     und die Huerde damit erledigt.
//   - Das Feld schaltet Autokorrektur, Auto-Grossschreibung und
//     Rechtschreibpruefung ab; sonst kaempft man am Handy gegen die Tastatur
//     statt gegen die Entscheidung.
//
// Abbrechen, Schliessen und Escape setzen das Feld zurueck. Ein gesetzter
// `blockedReason` haelt den Knopf gesperrt und steht als Hinweis im Dialog;
// ein gesetzter `error` bleibt stehen, ohne den Dialog zu schliessen (der
// Aufrufer schliesst erst, wenn seine Aktion durch ist).
export function TypeToConfirm({
  open,
  onClose,
  title,
  word,
  confirmLabel,
  onConfirm,
  busy = false,
  blockedReason = null,
  error = null,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Zeichengenau abzutippendes Wort (z. B. der Name der laufenden Journey). */
  word: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Laeuft die Aktion gerade? Sperrt beide Knoepfe. */
  busy?: boolean;
  /** Grund, der den Wechsel verhindert; gesetzt = Knopf bleibt gesperrt. */
  blockedReason?: string | null;
  /** Fehler der letzten Bestaetigung; bleibt im offenen Dialog stehen. */
  error?: string | null;
  /** Erklaerender Inhalt ueber dem Tippfeld. */
  children: ReactNode;
}): React.ReactElement {
  const [typed, setTyped] = useState("");
  const fieldId = useId();

  // Jedes Oeffnen faengt leer an - egal, ob zuletzt abgebrochen oder
  // geschlossen wurde.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const blocked = blockedReason !== null && blockedReason !== "";
  const ready = !busy && !blocked && typedConfirmMatches(typed, word);

  return (
    <Overlay open={open} onClose={onClose} title={title} className="select-none">
      {children}

      {blocked && (
        <div className="mb-4 rounded-[14px] border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] leading-[1.5] text-foreground">
          {blockedReason}
        </div>
      )}

      <label
        htmlFor={fieldId}
        className="mb-2 block text-[13px] leading-[1.5] text-muted-foreground"
      >
        Tippe zur Bestätigung den Namen:{" "}
        <span className="font-semibold text-foreground">„{word}“</span>
      </label>
      <Input
        id={fieldId}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={busy || blocked}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        className="mb-4 select-text"
      />

      {error !== null && error !== "" && (
        <p className="mb-4 text-[13px] leading-[1.5] text-danger">{error}</p>
      )}

      <div className="flex flex-col gap-2.5">
        <Button onClick={onConfirm} disabled={!ready}>
          {confirmLabel}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Abbrechen
        </Button>
      </div>
    </Overlay>
  );
}
