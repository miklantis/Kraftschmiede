import { useState } from "react";
import { Section } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  Calendar,
  currentMonth,
  shiftMonth,
  type CalendarMonth,
} from "@/components/ui/calendar";
import { SessionLogCard } from "@/components/history/SessionLogCard";
import { SessionEditPanel } from "@/components/history/SessionEditPanel";
import { useHistory } from "@/hooks/useHistory";
import { useDeleteSession } from "@/hooks/useDeleteSession";
import type { HistoryKind } from "@/lib/history";

// Verlauf-Band der Trainingsseite: navigierbarer Monatskalender und Liste der
// letzten Einheiten mit aufklappbarer Zusammenfassung und Bearbeiten-Panel.
// Fruehere eigene Seite (/verlauf); jetzt unter Training als eigenstaendiger,
// wiederverwendbarer Block. Desktop zeigt beides nebeneinander (Kalender links
// und etwas breiter, Liste rechts); Mobile hat einen Umschalter und zeigt eine
// Ansicht. Bringt seine Datenanbindung selbst mit; die Trainingsseite bindet
// den Block nur ein. Keine Statistik-Reihe, keine Charts (Paritaet zu V1).
//
// Der Block gibt zwei DOM-Elemente auf oberster Ebene aus (Umschalter, dann das
// Zwei-Spalten-Gitter mit je einer als `data-reveal-group` markierten Spalte),
// damit die PageReveal-Staffelung der Trainingsseite unveraendert greift.

// Farb-/Hintergrundklassen der Kalenderpunkte je Typ (Optik aus V1 cal-dot).
const CAL_DOT: Record<HistoryKind, string> = {
  kraft: "text-primary bg-primary/15",
  skill: "text-[#3f7fb5] bg-skill/15",
  yoga: "text-[#6b5fb8] bg-yoga/15",
  dev: "text-deviation-foreground bg-deviation/20",
};

const EYEBROW =
  "mb-2.5 text-[13px] font-semibold tracking-[0.6px] text-muted-foreground uppercase min-[960px]:mb-3 min-[960px]:text-[12px] min-[960px]:tracking-[0.7px]";

export function HistorySection(): React.ReactElement {
  const { isLoading, isError, data } = useHistory();
  const del = useDeleteSession();
  const [month, setMonth] = useState<CalendarMonth>(currentMonth);
  const [view, setView] = useState<"list" | "calendar">("list");
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

  const calendar = (
    <Calendar
      month={month}
      onPrev={() => setMonth((c) => shiftMonth(c, -1))}
      onNext={() => setMonth((c) => shiftMonth(c, 1))}
      onToday={() => setMonth(currentMonth())}
      renderCell={(iso) => {
        const entries = data.byDate[iso];
        if (!entries) return null;
        return entries.map((e, i) => (
          <span
            key={i}
            className={
              "truncate rounded-[4px] px-[3px] py-px text-center text-[8.5px] font-bold leading-[1.25] min-[960px]:rounded-[5px] min-[960px]:px-1 min-[960px]:py-0.5 min-[960px]:text-[9.5px] min-[960px]:leading-[1.3] " +
              CAL_DOT[e.kind]
            }
          >
            {e.label}
          </span>
        ));
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
        {data.sessions.map((s) => (
          <SessionLogCard
            key={s.id}
            session={s}
            deleting={del.isPending}
            onDelete={(id) => void del.delete(id)}
            onEdit={(id) => setEditId(id)}
          />
        ))}
      </div>
    );

  return (
    <>
      {/* Umschalter nur am Handy. */}
      <div className="min-[960px]:hidden">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Liste" },
            { value: "calendar", label: "Kalender" },
          ]}
        />
      </div>

      {/* Kalender links (breiter), Liste rechts; gleiches 1,6/1-Raster wie der
          obere Block, damit die Spaltenkante fluchtet. Am Handy je nach Umschalter. */}
      <div className="grid grid-cols-1 gap-6 min-[960px]:grid-cols-[1.6fr_1fr] min-[960px]:items-start min-[960px]:gap-[26px]">
        <div
          data-reveal-group
          className={
            (view === "calendar" ? "block" : "hidden") + " min-[960px]:block"
          }
        >
          <div className={EYEBROW + " hidden min-[960px]:block"}>Kalender</div>
          {calendar}
        </div>

        <div
          data-reveal-group
          className={(view === "list" ? "block" : "hidden") + " min-[960px]:block"}
        >
          <Section eyebrow="Letzte Einheiten">{list}</Section>
        </div>
      </div>

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
