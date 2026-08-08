import { Link } from "@tanstack/react-router";

// Leerzustand, wenn noch keine Journey existiert. Erklaert kurz den Nutzen und
// fuehrt zum Vorlagen-Waehler. Optik aus V1 (jr-empty).
export function JourneyEmpty(): React.ReactElement {
  return (
    <div className="rounded-[20px] bg-card px-6 py-7 shadow-card min-[960px]:px-7">
      <div className="text-[17px] font-semibold text-foreground">
        Keine aktive Journey
      </div>
      <div className="mt-1.5 mb-[18px] max-w-[520px] text-[14px] leading-[1.55] text-muted-foreground">
        Du trainierst gerade frei: Der Coach gibt nichts vor und übernimmt in
        jeder Einheit nur die Werte vom letzten Mal. Eine Journey gibt deinem
        Training über Wochen wieder einen roten Faden – wähle eine Vorlage, die
        zu deinem Ziel passt.
      </div>
      <Link
        to="/journey/waehlen"
        className="inline-flex items-center justify-center rounded-control bg-primary px-[18px] py-3 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105"
      >
        Journey aus Vorlage wählen
      </Link>
    </div>
  );
}
