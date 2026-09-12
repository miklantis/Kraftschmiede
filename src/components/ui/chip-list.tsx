import { cn } from "@/lib/utils";

// Reine Anzeige einer Wertereihe als Chips, domaenenfrei. Gleiche Pille wie im
// ChipEditor, aber ohne × und ohne Hinzufuegen-Knoepfe: fuer Orte, die einen
// Bestand nur zeigen (Inventar-Abschnitt der Uebungsseite), waehrend gepflegt
// wird er weiter nur in den Einstellungen.
//
// Die gemeinsame Optik steht hier als CHIP_BASE und wird vom ChipEditor
// mitbenutzt, damit beide Orte nie auseinanderlaufen. Das Innenabstands-Paar
// bleibt beim Aufrufer: der Editor braucht rechts Platz fuer das ×, die reine
// Anzeige ist rundum gleich.
export const CHIP_BASE =
  "inline-flex items-center rounded-pill bg-muted text-sm font-medium text-foreground tabular-nums";

export function ChipList({
  values,
  className,
}: {
  values: string[];
  className?: string;
}): React.ReactElement {
  return (
    // span statt div: die Liste steht auch in der Unterzeile einer Listenreihe
    // (SettingRow), und dort ist der umgebende Knoten ein span.
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {values.map((v) => (
        <span key={v} className={cn(CHIP_BASE, "px-2.5 py-0.5")}>
          {v}
        </span>
      ))}
    </span>
  );
}
