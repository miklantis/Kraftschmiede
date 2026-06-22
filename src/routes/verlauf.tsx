import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  Calendar,
  currentMonth,
  shiftMonth,
  type CalendarMonth,
} from "@/components/ui/calendar";
import { SessionLogCard } from "@/components/history/SessionLogCard";
import { useHistory } from "@/hooks/useHistory";
import { useDeleteSession } from "@/hooks/useDeleteSession";
import type { HistoryKind } from "@/lib/history";

// Verlauf: navigierbarer Monatskalender und Liste der letzten Einheiten mit
// aufklappbarer Zusammenfassung. Desktop zeigt beides nebeneinander (Kalender
// etwas breiter, 1.35/1 wie V1); Mobile hat einen Umschalter und zeigt eine
// Ansicht. Keine Statistik-Reihe, keine Charts (Parität zu V1).
export const Route = createFileRoute("/verlauf")({
  component: VerlaufPage,
});

// Farb-/Hintergrundklassen der Kalenderpunkte je Typ (Optik aus V1 cal-dot).
const CAL_DOT: Record<HistoryKind, string> = {
  kraft: "text-primary bg-primary/15",
  skill: "text-[#3f7fb5] bg-skill/15",
  yoga: "text-[#6b5fb8] bg-yoga/15",
  dev: "text-deviation-foreground bg-deviation/20",
};

const EYEBROW =
  "mb-2.5 text-[13px] font-semibold tracking-[0.6px] text-muted-foreground uppercase min-[960px]:mb-3 min-[960px]:text-[12px] min-[960px]:tracking-[0.7px]";

function VerlaufPage(): React.ReactElement {
  const { isLoading, isError, error, data } = useHistory();
  const del = useDeleteSession();
  const [month, setMonth] = useState<CalendarMonth>(currentMonth);
  const [view, setView] = useState<"list" | "calendar">("list");

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Verlauf" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Verlauf" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
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
          />
        ))}
      </div>
    );

  return (
    <div>
      <PageHeader title="Verlauf" />

      {/* Umschalter nur am Handy. */}
      <div className="mb-3.5 min-[960px]:hidden">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Liste" },
            { value: "calendar", label: "Kalender" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 min-[960px]:grid-cols-[1.35fr_1fr] min-[960px]:items-start min-[960px]:gap-[26px]">
        {/* Kalender: am Handy nur in der Kalender-Ansicht, am Desktop immer. */}
        <div className={(view === "calendar" ? "block" : "hidden") + " min-[960px]:block"}>
          <div className={EYEBROW + " hidden min-[960px]:block"}>Kalender</div>
          {calendar}
        </div>

        {/* Letzte Einheiten: am Handy nur in der Listen-Ansicht, am Desktop immer. */}
        <div className={(view === "list" ? "block" : "hidden") + " min-[960px]:block"}>
          <Section eyebrow="Letzte Einheiten">{list}</Section>
        </div>
      </div>
    </div>
  );
}
