import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Kleine Beschriftung ueber einem Eingabefeld oder einer Feldgruppe
// ("Eyebrow"): 12px, halbfett, leicht gesperrte Laufweite, gedaempfte Farbe.
// Die Optik stand vorher handgeschrieben in acht Dateien, dreimal davon als
// jeweils eigene lokale Hilfskomponente gleichen Namens (Issue #404).
//
// Bewusst ohne eigenen Abstand nach unten: die Aufrufer setzen ihn
// unterschiedlich (mal mb-2, mal mb-1.5, mal gar keinen, weil der umgebende
// Flex-Container per gap schon Luft schafft). Der Abstand kommt deshalb ueber
// className vom Aufrufer, damit hier nur das steckt, was ueberall gleich ist.
//
// Nicht gemeint sind der Grossbuchstaben-Eyebrow ueber der 1RM-Karte
// (LivePanel, EndModal) und die Abschnitts-Ueberschrift "Erreicht" in der
// Meilenstein-Liste: gleiche Schriftoptik, aber andere Aufgabe.
export function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "text-[12px] font-semibold tracking-[0.3px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
