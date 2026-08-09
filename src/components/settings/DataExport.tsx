import type { ReactElement } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExport } from "@/hooks/useExport";

// Voll-Export des Bestands als ein lesbares JSON, als Datei
// (kraftschmiede_DATUM.json) - die vollstaendige, datenbanktreue Sicherung zum
// Wiederherstellen. Die Aufbau-/DOM-Logik steckt in useExport bzw. den
// lib-Bausteinen; hier nur Knopf + Status.
export function DataExport(): ReactElement {
  const { exportToFile, status, isPending, error } = useExport();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Export (Sicherung)</h2>
      <p className="text-muted-foreground text-xs">
        Sichert deinen kompletten Bestand (Einheiten, Übungen, Vorlagen,
        Journeys, Skill-Fortschritt, Messungen, Einstellungen, Inventar) als eine
        JSON-Datei. Diese Datei lässt sich später wiederherstellen.
      </p>

      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void exportToFile()}
          disabled={isPending}
        >
          <Download />
          Als Datei sichern
        </Button>
      </div>

      {status === "file" && !isPending ? (
        <p className="text-muted-foreground text-xs">Datei heruntergeladen.</p>
      ) : null}
      {error !== null ? (
        <p className="text-danger text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
