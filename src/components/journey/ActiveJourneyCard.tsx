import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { JourneyHeadCard } from "./JourneyHeadCard";

// Kopfkarte der Journey-Seite: Name, Meta-Zeile (Vorlage + Startdatum) und der
// Bearbeiten-Knopf, der zum Vorlagen-Waehler fuehrt. Die Ueberschrift „Aktive
// Journey" sitzt als Section-Eyebrow ausserhalb der Karte (wie Periodisierung /
// Phasen · Ablauf). Die Karte selbst kommt aus JourneyHeadCard, damit die
// Rueckschau archivierter Journeys dieselbe Optik teilt.
export function ActiveJourneyCard({
  name,
  metaLine,
}: {
  name: string;
  metaLine: string;
}): React.ReactElement {
  return (
    <JourneyHeadCard
      name={name}
      metaLine={metaLine}
      action={
        <Link
          to="/journey/waehlen"
          aria-label="Journey bearbeiten"
          className="inline-flex flex-none items-center gap-2 rounded-control border border-primary/40 bg-card px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 min-[960px]:px-3.5"
        >
          <Pencil className="size-[15px]" />
          <span className="hidden min-[960px]:inline">Bearbeiten</span>
        </Link>
      }
    />
  );
}
