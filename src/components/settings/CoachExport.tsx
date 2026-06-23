import { useState, type ReactElement } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/ui/segmented";
import { useCoachExport } from "@/hooks/useCoachExport";

// Spanne-Auswahl: letzte X Wochen oder alles. "all" = kompletter Verlauf.
type RangeValue = "8" | "12" | "26" | "all";

const RANGE_OPTIONS: SegmentOption<RangeValue>[] = [
  { value: "8", label: "8 Wo." },
  { value: "12", label: "12 Wo." },
  { value: "26", label: "26 Wo." },
  { value: "all", label: "Alle" },
];

// Schlanker Export rein fuer das Gespraech mit dem Coach: sprechendes JSON
// (Journey/Phasen, Einheiten mit Zuordnung und kompakten Saetzen, Skill, Body-
// Trend), ohne DB-Ballast. Nur Zwischenablage, kein Datei-Download.
export function CoachExport(): ReactElement {
  const [range, setRange] = useState<RangeValue>("12");
  const { copyForCoaching, isPending, done, error } = useCoachExport();

  const weeks = range === "all" ? null : Number(range);

  return (
    <section className="w-full max-w-md space-y-3 text-left">
      <h2 className="text-sm font-semibold">Für Coaching</h2>
      <p className="text-muted-foreground text-xs">
        Schlankes JSON zum Besprechen mit dem Coach: Journey und Phasen, deine
        Einheiten mit Zuordnung (Journey, Phase, Woche, Workout) und kompakten
        Sätzen, Skill-Fortschritt und Body-Trend. Spanne wählbar.
      </p>

      <SegmentedControl
        options={RANGE_OPTIONS}
        value={range}
        onChange={setRange}
        className="max-w-xs"
      />

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copyForCoaching(weeks)}
          disabled={isPending}
        >
          <MessageSquare />
          Für Coaching kopieren
        </Button>
      </div>

      {done && !isPending ? (
        <p className="text-muted-foreground text-xs">
          In die Zwischenablage kopiert.
        </p>
      ) : null}
      {error !== null ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
