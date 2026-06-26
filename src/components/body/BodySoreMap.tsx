import { MuscleMap } from "@/components/ui/muscle-map";
import { soreColor, KATER_HEX } from "@/lib/body";

// Muskelkater-Figur (beide Ansichten). Nutzt die generische MuscleMap aus
// Phase 8 unveraendert – nur mit der Kater-Farbfunktion (1..3 -> grau-Skala)
// und idle = Kater-0-Gruen (gute Regionen). Bei fehlenden Daten graue
// Silhouette ohne Gruen-Einfaerbung. Info-Zeile darunter wie V1.
export function BodySoreMap({
  values,
  info,
}: {
  values: Record<string, number> | null;
  info: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center">
      <MuscleMap
        values={values ?? {}}
        view="both"
        colorFn={soreColor}
        idle={values ? KATER_HEX[0] : undefined}
        regionOpacity={0.5}
        ariaLabel="Geschätzter Muskelkater"
        className="max-w-[78%]"
      />
      <div className="mt-1 text-[13px] text-muted-foreground">{info}</div>
    </div>
  );
}
