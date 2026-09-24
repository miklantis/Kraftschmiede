import { useMemo } from "react";
import { fastenStand, fastenTextFuer } from "@/lib/fasten";
import { todayISO } from "@/lib/format";
import { useZeitraeume } from "./useZeitraeume";
import { useFastenTage } from "./useFastenTage";
import type { FastenTagRow } from "@/schemas";

/** Anzeigefertiger Stand des Fastenbegleiters fuer heute. */
export interface FastenbegleiterView {
  /** Fastentag, 1-basiert. */
  tag: number;
  /** Zahl der Fastentage insgesamt; null ohne Enddatum. */
  von: number | null;
  /** Letzter Fastentag als kurzes Datum („4. Oktober“); null ohne Ende. */
  bisLabel: string | null;
  /** Text des Tages; null, solange die Texte laden oder keiner passt. */
  text: FastenTagRow | null;
}

// Kurzes Datum ohne Jahr, z. B. „4. Oktober“.
function tagMonat(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

// Liegt heute in einem Heilfasten-Zeitraum? Dann der Stand samt Tagestext,
// sonst null. `isLoading` gilt nur, solange die Zeitraeume noch fehlen - erst
// danach steht fest, ob die Trainingsseite normal oder als Fastenseite
// erscheint. Die Texte duerfen nachkommen, die Box zeigt bis dahin nur ihren
// Kopf.
export function useFastenbegleiter(): {
  isLoading: boolean;
  view: FastenbegleiterView | null;
} {
  const zeitraeumeQ = useZeitraeume();
  const texteQ = useFastenTage();
  const heute = todayISO();

  const view = useMemo((): FastenbegleiterView | null => {
    const stand = fastenStand(zeitraeumeQ.data ?? [], heute);
    if (stand === null) return null;
    return {
      tag: stand.tag,
      von: stand.von,
      bisLabel: stand.bis === null ? null : tagMonat(stand.bis),
      text: fastenTextFuer(texteQ.data ?? [], stand.tag),
    };
  }, [zeitraeumeQ.data, texteQ.data, heute]);

  return { isLoading: zeitraeumeQ.isLoading, view };
}
