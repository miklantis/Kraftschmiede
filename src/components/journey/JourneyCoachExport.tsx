import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoachExport } from "@/hooks/useCoachExport";

// Coach-Export einer einzelnen Journey aus der Rueckschau heraus: derselbe
// schlanke JSON-Aufbau wie in den Einstellungen, nur auf diese Journey
// eingegrenzt (ihre Einheiten, ihre Phasen, Koerper- und Zeitraum-Daten aus
// genau ihrem Fenster). Nur Zwischenablage, kein Datei-Download.
export function JourneyCoachExport({
  journeyId,
  description = "Kopiert diese Journey als schlankes JSON: Phasen, alle Einheiten mit Sätzen und Zuordnung sowie Körperwerte aus ihrem Zeitraum.",
}: {
  journeyId: string;
  description?: string;
}): React.ReactElement {
  const { copyForCoaching, isPending, done, error } = useCoachExport();

  return (
    <div className="rounded-card bg-card px-5 py-[18px] shadow-card">
      <div className="text-[15px] font-semibold text-foreground">
        Mit dem Coach besprechen
      </div>
      <p className="mt-1 mb-3 text-[13px] leading-[1.55] text-muted-foreground">
        {description}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void copyForCoaching(null, journeyId)}
        disabled={isPending}
      >
        <MessageSquare />
        Für Coaching kopieren
      </Button>
      {done && !isPending ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          In die Zwischenablage kopiert.
        </p>
      ) : null}
      {error !== null ? (
        <p className="mt-2 text-[13px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
