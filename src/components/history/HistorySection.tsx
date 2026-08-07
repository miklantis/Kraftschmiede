import { useState } from "react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  currentMonth,
  shiftMonth,
  type CalendarMonth,
} from "@/components/ui/calendar";
import { SessionLogCard } from "@/components/history/SessionLogCard";
import { SessionEditPanel } from "@/components/history/SessionEditPanel";
import { ZeitraeumeSection } from "@/components/history/ZeitraeumeSection";
import { useHistory } from "@/hooks/useHistory";
import { useZeitraeume } from "@/hooks/useZeitraeume";
import {
  zeitraumWochenBaender,
  zeitraumLabel,
  ZEITRAUM_FARBE,
} from "@/lib/zeitraeume";
import { useDeleteSession } from "@/hooks/useDeleteSession";
import type { HistoryKind } from "@/lib/history";

// Verlauf-Block der Trainingsseite: navigierbarer Monatskalender und Liste der
// letzten Einheiten mit aufklappbarer Zusammenfassung und Bearbeiten-Panel.
// Fruehere eigene Seite (/verlauf); jetzt unter Training als eigenstaendiger,
// wiederverwendbarer Block – rechte Spalte der Trainingsseite. Kalender (oben)
// und Liste (darunter) sind auf Handy wie Desktop gleich gestapelt (kein
// Umschalter mehr). Bringt seine Datenanbindung selbst mit; die Trainingsseite
// bindet den Block nur ein. Keine Statistik-Reihe, keine Charts (Paritaet zu V1).
//
// Die Liste zeigt zunaechst die juengsten PAGE_SIZE Einheiten; „Mehr laden\"
// blendet jeweils PAGE_SIZE weitere ein (reine Anzeige, Daten liegen schon vor).
//
// Die Bloecke (Kalender, Liste) laufen in der umgebenden reveal-group der
// Trainingsseite mit; der Block markiert selbst keine eigenen Spalten mehr.

// Farb-/Hintergrundklassen der Kalenderpunkte je Typ (Optik aus V1 cal-dot).
const CAL_DOT: Record<HistoryKind, string> = {
  kraft: "text-primary bg-primary/15",
  skill: "text-[#3f7fb5] bg-skill/15",
  yoga: "text-[#6b5fb8] bg-yoga/15",
  dev: "text-deviation-foreground bg-deviation/20",
  rmtest: "text-primary bg-primary/15",
};

// Rundung eines Band-Segments: nur am echten Start-/Endtag abrunden, sonst eckig,
// damit ein ueber mehrere Tage/Wochen laufender Zeitraum als durchgehendes Band
// wirkt und die Fortsetzung an Wochengrenzen sichtbar bleibt. Vollstaendige
// Tailwind-Literale, kein Laufzeit-Zusammenbau der Klassennamen.
function bandRadius(isStart: boolean, isEnd: boolean): string {
  if (isStart && isEnd) return "rounded-[4px]";
  if (isStart) return "rounded-l-[4px]";
  if (isEnd) return "rounded-r-[4px]";
  return "rounded-none";
}

// Vollstaendige Klassenliterale fuer die Grid-Platzierung der Baender (1-basiert).
// Ein Balken belegt colStart..colStart+colSpan-1 und liegt in seiner Slot-Zeile.
const COL_START = [
  "",
  "col-start-1",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];
const COL_SPAN = [
  "",
  "col-span-1",
  "col-span-2",
  "col-span-3",
  "col-span-4",
  "col-span-5",
  "col-span-6",
  "col-span-7",
];
const ROW_START = [
  "row-start-1",
  "row-start-2",
  "row-start-3",
  "row-start-4",
  "row-start-5",
  "row-start-6",
];

const EYEBROW =
  "mb-2.5 text-[13px] font-semibold tracking-[0.6px] text-muted-foreground uppercase min-[960px]:mb-3 min-[960px]:text-[12px] min-[960px]:tracking-[0.7px]";

// Anzahl der zunaechst sichtbaren Einheiten; „Mehr laden\" legt jeweils so
// viele weitere frei.
const PAGE_SIZE = 5;

export function HistorySection(): React.ReactElement {
  const { isLoading, isError, data } = useHistory();
  const zeitraeume = useZeitraeume();
  const del = useDeleteSession();
  const [month, setMonth] = useState<CalendarMonth>(currentMonth);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editId, setEditId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Section eyebrow="Verlauf">
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </Section>
    );
  }

  if (isError || !data) {
    return (
      <Section eyebrow="Verlauf">
        <p className="text-sm text-danger">
          Der Verlauf konnte nicht geladen werden.
        </p>
      </Section>
    );
  }

  // Zeitraum-Baender fuer den angezeigten Monat, je Kalenderwoche als
  // durchgehende Segmente vorberechnet.
  const wochenBaender = zeitraumWochenBaender(zeitraeume.data ?? [], month.y, month.m);

  const calendar = (
    <Calendar
      month={month}
      onPrev={() => setMonth((c) => shiftMonth(c, -1))}
      onNext={() => setMonth((c) => shiftMonth(c, 1))}
      onToday={() => setMonth(currentMonth())}
      renderWeekBands={(_week, weekIndex) => {
        const segs = wochenBaender[weekIndex];
        if (!segs || segs.length === 0) return null;
        return segs.map((seg) => (
          <span
            key={seg.id + "-" + seg.colStart}
            title={zeitraumLabel(seg.typ)}
            className={
              "block truncate px-1 text-left text-[8.5px] font-bold leading-[15px] text-white min-[960px]:px-1.5 min-[960px]:text-[9.5px] min-[960px]:leading-[18px] " +
              ZEITRAUM_FARBE[seg.typ] +
              " " +
              bandRadius(seg.isStart, seg.isEnd) +
              " " +
              COL_START[seg.colStart] +
              " " +
              COL_SPAN[seg.colSpan] +
              " " +
              ROW_START[Math.min(seg.slot, 5)]
            }
          >
            {seg.label}
          </span>
        ));
      }}
      renderCell={(iso) => {
        const entries = data.byDate[iso];
        if (!entries) return null;
        return (
          <>
            {entries.map((e, i) => (
              <span
                key={i}
                className={
                  "truncate rounded-[4px] px-[3px] py-px text-center text-[8.5px] font-bold leading-[1.25] min-[960px]:rounded-[5px] min-[960px]:px-1 min-[960px]:py-0.5 min-[960px]:text-[9.5px] min-[960px]:leading-[1.3] " +
                  CAL_DOT[e.kind]
                }
              >
                {e.label}
              </span>
            ))}
          </>
        );
      }}
    />
  );

  const list =
    data.sessions.length === 0 ? (
      <div className="rounded-[16px] bg-card px-[18px] py-[22px] text-center text-sm text-muted-foreground shadow-card">
        Noch keine Einheiten. Starte ein Workout im Training.
      </div>
    ) : (
      <div className="flex flex-col gap-2.5">
        {data.sessions.slice(0, visibleCount).map((s) => (
          <SessionLogCard
            key={s.id}
            session={s}
            deleting={del.isPending}
            onDelete={(id) => void del.delete(id)}
            onEdit={(id) => setEditId(id)}
          />
        ))}
        {data.sessions.length > visibleCount && (
          <Button
            variant="outline"
            className="mt-1 w-full"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Mehr laden
          </Button>
        )}
      </div>
    );

  return (
    <>
      {/* Kalender oben, Liste darunter – auf Handy wie Desktop gleich gestapelt.
          Kein Umschalter mehr; beide Bloecke tragen ihre Ueberschrift. Kein
          eigenes data-reveal-group: die Bloecke laufen in der umgebenden Spalte
          der Trainingsseite mit. */}
      <div>
        <div className={EYEBROW}>Kalender</div>
        {calendar}
      </div>

      <Section eyebrow="Letzte Einheiten">{list}</Section>

      <ZeitraeumeSection />

      <SessionEditPanel
        sessionId={editId}
        title={editId ? data.sessions.find((s) => s.id === editId)?.title : undefined}
        dateLabel={
          editId ? data.sessions.find((s) => s.id === editId)?.dateLabel : undefined
        }
        open={editId !== null}
        onClose={() => setEditId(null)}
      />
    </>
  );
}
