import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Generischer Notiz-Baustein: eine einzelne Freitext-Notiz in drei Zustaenden.
// Domaenenfrei - er weiss nicht, ob die Notiz an einer Uebung, einer Einheit
// oder einem Test haengt.
//
//   1. Ohne Notiz  -> nur ein schlanker Textknopf "+ Notiz". Kein leeres
//      Eingabefeld im Weg.
//   2. Beim Schreiben -> mehrzeiliges Feld, deutlich abgesetzt (Kartengrund mit
//      gruenem Rahmen, genau wie der aktive Satz), darunter Speichern /
//      Abbrechen und rechts der Papierkorb.
//   3. Gespeichert -> reiner Text im ruhigen Block, rechts ein Stift zum
//      erneuten Bearbeiten.
//
// Leere Notiz beim Speichern = Notiz entfernen. Den Bearbeiten-Zustand haelt der
// Baustein selbst; nach aussen geht nur der fertige Text (onChange).
//
// `bare` nimmt beide Flaechen weg: das Feld steht nur im gruenen Rahmen, die
// gespeicherte Notiz als reiner Text - fuer Stellen, an denen die Notiz direkt
// auf dem Seitenhintergrund liegt statt in einer Karte (Live-Panel).
//
// `actions` fuellt die linke Seite der Knopfzeile (z. B. die vorhandene
// Fusszeile eines Blocks), damit der "+ Notiz"-Knopf rechts daneben sitzen kann
// und das Eingabefeld trotzdem darunter aufklappt statt in der Zeile.

export function NoteBlock({
  value,
  onChange,
  label = "Notiz",
  placeholder = "Notiz …",
  compact = false,
  bare = false,
  actions,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  bare?: boolean;
  actions?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  // Aeusseren Wert uebernehmen, solange nicht getippt wird (z. B. nachdem eine
  // andere Stelle die Notiz geaendert hat).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function open(): void {
    setDraft(value);
    setEditing(true);
  }

  function save(): void {
    onChange(draft.trim());
    setEditing(false);
  }

  function cancel(): void {
    setDraft(value);
    setEditing(false);
  }

  function remove(): void {
    onChange("");
    setEditing(false);
  }

  // Beim Aufklappen in das Feld springen, Cursor ans Ende.
  useEffect(() => {
    if (!editing) return;
    const el = fieldRef.current;
    if (el == null) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const hasNote = value.trim() !== "";
  const showTrigger = !editing && !hasNote;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(actions != null || showTrigger) && (
        <div className="flex items-center gap-4">
          {actions}
          {showTrigger && (
            <button
              type="button"
              onClick={open}
              className="ml-auto text-[13px] font-semibold text-primary"
            >
              + {label}
            </button>
          )}
        </div>
      )}

      {editing && (
        <div
          className={cn(
            "rounded-control border-2 border-primary px-3 py-2.5",
            bare ? "bg-transparent" : "bg-card",
          )}
        >
          {!compact && (
            <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
              {label}
            </span>
          )}
          <textarea
            ref={fieldRef}
            aria-label={label}
            rows={3}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            // 16px auf Mobile: darunter zoomt iOS Safari beim Antippen
            // automatisch ins Feld hinein. Ab Desktop wieder 14px wie der
            // gespeicherte Notiztext.
            className="w-full resize-none bg-transparent text-[16px] leading-snug text-foreground outline-none placeholder:text-muted-foreground min-[960px]:text-[14px]"
          />
          <div className="mt-1.5 flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              className="text-[13px] font-semibold text-primary"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-[13px] font-semibold text-muted-foreground"
            >
              Abbrechen
            </button>
            {hasNote && (
              <button
                type="button"
                onClick={remove}
                aria-label={label + " entfernen"}
                className="ml-auto text-muted-foreground transition-colors hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!editing && hasNote && (
        <div
          className={cn(
            "flex items-start gap-2",
            bare ? "px-0.5" : "rounded-control bg-muted px-3 py-2.5",
          )}
        >
          <div className="min-w-0 flex-1">
            {!compact && (
              <span className="mb-1 block text-[13px] font-semibold text-muted-foreground">
                {label}
              </span>
            )}
            <p className="text-[14px] leading-snug break-words whitespace-pre-wrap text-foreground">
              {value}
            </p>
          </div>
          <button
            type="button"
            onClick={open}
            aria-label={label + " bearbeiten"}
            className="-mr-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
