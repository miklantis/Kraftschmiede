import type { ReactNode } from "react";

// Zwei-Spalten-Layout wie V1 (train-grid): mobil alles untereinander, ab 960px
// Haupt- und Seitenspalte nebeneinander (1.2fr / 1fr – Hauptspalte etwas breiter).
// Innerhalb jeder Spalte stapeln sich die Bloecke mit etwas Abstand.
//
// Die beiden Spalten sind als `data-reveal-group` markiert: PageReveal staffelt
// dann die Bloecke innerhalb jeder Spalte eigenstaendig (beide Spalten starten
// parallel und laufen je von oben nach unten).
export function TwoColumn({
  main,
  side,
}: {
  main: ReactNode;
  side: ReactNode;
}): React.ReactElement {
  return (
    <div className="grid grid-cols-1 items-start gap-y-6 min-[960px]:grid-cols-[1.2fr_1fr] min-[960px]:gap-x-[26px]">
      <div
        data-reveal-group
        className="flex min-w-0 flex-col gap-6 min-[960px]:gap-7"
      >
        {main}
      </div>
      <div
        data-reveal-group
        className="flex min-w-0 flex-col gap-6 min-[960px]:gap-7"
      >
        {side}
      </div>
    </div>
  );
}
