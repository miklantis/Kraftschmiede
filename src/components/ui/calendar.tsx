import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayISO } from "@/lib/format";

// Generisches Monatsgitter (Optik 1:1 aus V1 ks-cal-card). Der Baustein kennt nur
// Monat, Navigation und das heutige Datum; was in einer Tageszelle unter der
// Tagesnummer steht (z. B. Trainings-Punkte), liefert der Aufrufer ueber
// renderCell. Dadurch laesst er sich spaeter auch fuer Journey/Koerper nutzen.

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const DOW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export interface CalendarMonth {
  y: number;
  m: number; // 0-basiert (0 = Januar)
}

// Heutiger Monat als Startwert.
export function currentMonth(): CalendarMonth {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() };
}

// Monat um delta verschieben (Jahreswechsel inklusive).
export function shiftMonth(c: CalendarMonth, delta: number): CalendarMonth {
  let m = c.m + delta;
  let y = c.y;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }
  return { y, m };
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function isoOf(y: number, m: number, d: number): string {
  return y + "-" + pad(m + 1) + "-" + pad(d);
}

export function Calendar({
  month,
  onPrev,
  onNext,
  onToday,
  renderCell,
  renderWeekBands,
}: {
  month: CalendarMonth;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  // Inhalt einer Tageszelle unter der Tagesnummer (z. B. Session-Markierungen).
  renderCell?: (iso: string) => ReactNode;
  // Durchgehende Baender ueber einer Kalenderwoche. Bekommt die sieben ISO-Tage
  // der Woche (null = Leerzelle ausserhalb des Monats) und den Wochenindex und
  // liefert die Balken-Elemente; sie werden in ein 7-Spalten-Gitter gelegt, das
  // spaltengenau zu den Tageszellen darunter passt (col-start/col-span je Balken).
  // Gibt der Aufrufer null zurueck, entfaellt die Band-Zone dieser Woche.
  renderWeekBands?: (weekIsos: (string | null)[], weekIndex: number) => ReactNode;
}): React.ReactElement {
  const today = todayISO();
  const { y, m } = month;
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7; // Montag = 0
  const days = new Date(y, m + 1, 0).getDate();

  // Tage in Wochenzeilen zerlegen (fuehrende/abschliessende Leerzellen = null),
  // damit ueber jeder Woche eine spaltengenaue Band-Zone liegen kann.
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(isoOf(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const navBtn =
    "flex size-8 items-center justify-center rounded-[9px] border border-border bg-card text-[#6b7280] hover:bg-primary/5 min-[960px]:size-[34px]";

  return (
    <div className="rounded-[18px] bg-card p-3.5 shadow-card min-[960px]:rounded-[20px] min-[960px]:p-5">
      <div className="mb-3 flex items-center justify-between min-[960px]:mb-4">
        <button type="button" onClick={onPrev} aria-label="Vorheriger Monat" className={navBtn}>
          <ChevronLeft className="size-[18px]" />
        </button>
        <span className="text-[16px] font-bold text-foreground min-[960px]:text-[18px]">
          {MONTHS[m] + " " + y}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onToday}
            className="flex h-8 items-center rounded-[9px] border border-border bg-card px-3 text-[13px] font-semibold text-primary hover:bg-primary/5 min-[960px]:h-[34px] min-[960px]:px-3.5"
          >
            Heute
          </button>
          <button type="button" onClick={onNext} aria-label="Nächster Monat" className={navBtn}>
            <ChevronRight className="size-[18px]" />
          </button>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1 min-[960px]:mb-2 min-[960px]:gap-1.5">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-[#b0b0b6] min-[960px]:text-[12px]"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 min-[960px]:gap-1.5">
        {weeks.map((week, wi) => {
          const bands = renderWeekBands?.(week, wi);
          return (
            <div key={"w" + wi}>
              {bands ? (
                <div className="mb-1 grid auto-rows-[15px] grid-cols-7 gap-x-1 gap-y-[3px] min-[960px]:mb-1.5 min-[960px]:auto-rows-[18px] min-[960px]:gap-x-1.5">
                  {bands}
                </div>
              ) : null}
              <div className="grid grid-cols-7 gap-1 min-[960px]:gap-1.5">
                {week.map((iso, ci) =>
                  iso === null ? (
                    <div key={"e" + wi + "-" + ci} />
                  ) : (
                    <div
                      key={iso}
                      className={
                        "flex min-h-[54px] flex-col gap-0.5 overflow-hidden rounded-lg px-[3px] py-1 min-[960px]:min-h-[72px] min-[960px]:rounded-[10px] min-[960px]:px-[5px] min-[960px]:py-1.5 " +
                        (iso === today ? "bg-primary/10" : "bg-[#f7f7f9]")
                      }
                    >
                      <span
                        className={
                          "text-center text-[11px] font-medium min-[960px]:text-[12px] " +
                          (iso === today ? "font-bold text-primary" : "text-foreground")
                        }
                      >
                        {Number(iso.slice(8, 10))}
                      </span>
                      {renderCell?.(iso)}
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
