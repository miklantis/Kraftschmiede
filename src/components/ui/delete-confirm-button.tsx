import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Loeschen mit Zwei-Stufen-Rueckfrage innerhalb eines offenen Dialogs. Erster
// Klick auf den ruhigen grauen Knopf ("<Ding> loeschen") schaltet auf die rote
// Rueckfrage ("Wirklich loeschen?"), erst der zweite Klick loescht. Stand
// vorher viermal zeichengleich im Repo (Issue #405).
//
// Abgrenzung zu TypeToConfirm: dort wird ein Wort abgetippt, in einem eigenen
// Dialog, verbindlich fuer unwiderrufliche Handgriffe. Hier reicht der zweite
// Klick, weil die Huerde in einem bereits offenen Bearbeiten-Dialog sitzt und
// die Sache kleiner ist (ein Meilenstein, eine Messung, ein Zeitraum).
//
// `open` ist das open-Flag des umgebenden Dialogs: beim Oeffnen faellt der
// Knopf auf die erste Stufe zurueck, beim Schliessen bewusst nicht - sonst
// springt die rote Stufe waehrend der Ausblende-Animation des Overlays sichtbar
// auf grau zurueck.
//
// `disabled` wirkt nur auf die rote Stufe, so wie vorher: der graue Anstoss
// laesst sich immer druecken, das Loeschen selbst nicht waehrend eines
// laufenden Schreibvorgangs.
export function DeleteConfirmButton({
  label,
  onDelete,
  open,
  disabled = false,
  className,
}: {
  /** Beschriftung der ersten Stufe, z. B. "Meilenstein loeschen". */
  label: string;
  onDelete: () => void;
  open: boolean;
  disabled?: boolean;
  className?: string;
}): React.ReactElement {
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) setConfirm(false);
  }, [open]);

  if (confirm) {
    return (
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-[13px] border border-danger/40 py-3 text-[14px] font-semibold text-danger transition-[filter] hover:brightness-95 disabled:opacity-50",
          className,
        )}
      >
        <Trash2 className="size-4" />
        Wirklich löschen?
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-[13px] py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:text-danger",
        className,
      )}
    >
      <Trash2 className="size-4" />
      {label}
    </button>
  );
}
