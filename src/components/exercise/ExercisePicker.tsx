import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import { groupExercises } from "@/lib/exercises";
import type { ExerciseRow } from "@/schemas";

// Auswaehler fuer eine oder mehrere Uebungen aus dem Katalog. Baut auf dem
// generischen Overlay auf; die Liste ist wie die Uebungen-Seite gruppiert
// (Haupt/Assistenz/Core/Koerpergewicht), mit Suchfeld. Bereits gewaehlte
// Uebungen tragen einen Haken; Tippen schaltet die Zugehoerigkeit um. "Fertig"
// schliesst. Bewusst generisch (nur Katalog + gewaehlte Ids + Umschalter), damit
// er auch anderswo nutzbar ist.
export function ExercisePicker({
  open,
  onClose,
  exercises,
  selectedIds,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseRow[];
  selectedIds: Set<string>;
  onToggle: (exerciseId: string) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");

  // Beim Oeffnen die Suche zuruecksetzen.
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? exercises.filter((e) => e.name.toLowerCase().includes(q))
      : exercises;
    // Gruppierung wie die Uebungen-Seite; die Gewichtseinheit steuert nur die
    // Meta-Spalte, die hier nicht gezeigt wird.
    return groupExercises(filtered, "kg");
  }, [exercises, query]);

  return (
    <Overlay open={open} onClose={onClose} title="Übung hinzufügen">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Übung suchen …"
          className="h-10 pl-9"
          aria-label="Übung suchen"
        />
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Keine passende Übung.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
                {g.title}
              </div>
              <div className="flex flex-col">
                {g.items.map((it) => {
                  const on = selectedIds.has(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onToggle(it.id)}
                      aria-pressed={on}
                      className="flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span
                        className={
                          "flex size-[22px] flex-none items-center justify-center rounded-full border transition-colors " +
                          (on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-transparent")
                        }
                      >
                        <Check className="size-[14px]" strokeWidth={2.8} />
                      </span>
                      <span className="flex-1 text-[15px] font-medium text-foreground">
                        {it.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105"
      >
        Fertig
      </button>
    </Overlay>
  );
}
