import { PhaseDot } from "./PhaseDot";
import type { PhaseView, PhaseWeekRow } from "@/lib/journey";

// Detailzeilen einer Phase (Band, Satz-Rampe, Deload). Im Raster gestapelt
// (Schluessel ueber Wert), in der Liste als Zeile (Schluessel links, Wert rechts).
function DetailRows({
  phase,
  layout,
}: {
  phase: PhaseView;
  layout: "grid" | "list";
}): React.ReactElement {
  // Heller Grund nur auf der akzent-getoenten Karte der laufenden Phase; sonst
  // gedeckt, damit der Block auf weisser Karte ueberhaupt sichtbar bleibt.
  const tone = phase.isCurrent ? "bg-white/70" : "bg-muted";
  const box =
    "flex flex-col gap-2.5 rounded-[12px] p-3.5 " +
    (layout === "grid" ? "mt-3.5 " + tone : tone);
  return (
    <div className={box}>
      {phase.detail.map((d) => (
        <div
          key={d.k}
          className={
            layout === "grid"
              ? "flex flex-col gap-px"
              : "flex items-center justify-between gap-3"
          }
        >
          <span
            className={
              (layout === "grid" ? "text-[11.5px]" : "text-[13px]") +
              " text-muted-foreground"
            }
          >
            {d.k}
          </span>
          <span className="font-mono text-[13px] font-semibold text-foreground">
            {d.v}
          </span>
        </div>
      ))}
    </div>
  );
}

// Hinweiskasten an der laufenden Phase: die vorgegebene Last einer Journey mit
// Lastvorgabe. Erklaert den bewusst niedrigen Vorschlag oder das Ende der
// Vorgabe. Die Testphase braucht ihn nicht mehr - sie zeigt ihren Plan (#364).
function LoadNote({ text }: { text: string }): React.ReactElement {
  return (
    <div className="rounded-[12px] border border-primary/25 bg-white/70 px-3 py-2 text-[12.5px] leading-snug text-foreground">
      {text}
    </div>
  );
}

// Wochentabelle des Plans an einer Phase (Issue #225, Schritt 5): je Woche
// Saetze, Wiederholungen und Ziel-Anstrengung, darunter das Wochenziel.
// Abgeschlossene Wochen sind abgehakt, die laufende ist hervorgehoben, kuenftige
// stehen blass. Die Testwoche traegt statt Zahlen den Test selbst (#364). Eine
// Ueberschrift braucht der Block nicht - "Woche 1" sagt schon, was dort steht.
//
// `onAccent` sagt, ob der Block auf der akzent-getoenten Karte der laufenden
// Phase sitzt: dort tragen die Zeilen helles Weiss, auf weisser Karte waeren sie
// unsichtbar und stehen deshalb gedeckt (wie bei DetailRows).
function WeekPlanRows({
  rows,
  onAccent,
}: {
  rows: PhaseWeekRow[];
  onAccent: boolean;
}): React.ReactElement {
  const rest = onAccent ? "bg-white/45" : "bg-muted";
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <div
          key={r.label}
          className={
            "rounded-[10px] px-2.5 py-2 " +
            (r.state === "current"
              ? "bg-white/85 ring-1 ring-primary/30"
              : rest)
          }
        >
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={
                "text-[12.5px] " +
                (r.state === "future"
                  ? "text-foreground-subtle"
                  : "text-foreground")
              }
            >
              {r.mark ? r.mark + " " : ""}
              {r.label}
            </span>
            <span
              className={
                "font-mono text-[12.5px] font-semibold " +
                (r.state === "future"
                  ? "text-foreground-subtle"
                  : "text-foreground")
              }
            >
              {r.targets}
            </span>
          </div>
          {r.note && (
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
              {r.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Phasen einer Journey. Desktop: Raster mit bis zu vier Spalten, Mobile: Liste.
// Beide zeigen an jeder Phase dieselben Angaben - erledigte und kuenftige Phasen
// halten ihre Detailzeilen auch auf dem Handy (Issue #362). Optik aus V1 (jph):
// aktuelle Phase akzent-getoent, kuenftige gedimmt.
//
// Die Detail-Kachel entfaellt, wo die Wochentabelle dieselben Zahlen ohnehin
// Woche fuer Woche auffuehrt; das entscheidet lib/journey.ts, indem es die
// Detailzeilen dann leer laesst.
export function PhaseList({
  phases,
}: {
  phases: PhaseView[];
}): React.ReactElement {
  const cols = Math.min(Math.max(phases.length, 1), 4);
  return (
    <>
      {/* Desktop: Raster bis vier Spalten. */}
      <div
        className="hidden gap-3.5 min-[960px]:grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {phases.map((p, i) => (
          <div
            key={i}
            className={
              "flex flex-col rounded-[16px] border p-4 " +
              (p.isCurrent
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-card")
            }
          >
            <div className="mb-3">
              <PhaseDot state={p.state} mark={p.mark} />
            </div>
            <div
              className={
                "text-[16px] font-semibold " +
                (p.state === "future" ? "text-foreground-subtle" : "text-foreground")
              }
            >
              {p.name}
            </div>
            <div className="mt-0.5 text-[12.5px] text-foreground-subtle">{p.meta}</div>
            {p.loadNote !== null && (
              <div className="mt-3.5">
                <LoadNote text={p.loadNote} />
              </div>
            )}
            {p.detail.length > 0 && <DetailRows phase={p} layout="grid" />}
            {p.weekRows !== null && (
              <div className="mt-3.5">
                <WeekPlanRows rows={p.weekRows} onAccent={p.isCurrent} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Liste, jede Phase mit ihren Angaben. */}
      <div className="flex flex-col gap-2.5 min-[960px]:hidden">
        {phases.map((p, i) => (
          <div
            key={i}
            className={
              "overflow-hidden rounded-[16px] border " +
              (p.isCurrent
                ? "border-primary/30 bg-primary/10"
                : "border-border bg-card")
            }
          >
            <div className="flex items-center gap-3.5 px-4 py-[15px]">
              <PhaseDot state={p.state} mark={p.mark} />
              <div className="min-w-0 flex-1">
                <div
                  className={
                    "text-[15px] font-semibold " +
                    (p.state === "future"
                      ? "text-foreground-subtle"
                      : "text-foreground")
                  }
                >
                  {p.name}
                </div>
                <div className="text-[12px] text-foreground-subtle">{p.meta}</div>
              </div>
            </div>
            <div className="mx-3.5 mb-3.5">
              {p.loadNote !== null && (
                <div className="mb-2.5">
                  <LoadNote text={p.loadNote} />
                </div>
              )}
              {p.detail.length > 0 && <DetailRows phase={p} layout="list" />}
              {p.weekRows !== null && (
                <div className={p.detail.length > 0 ? "mt-2.5" : ""}>
                  <WeekPlanRows rows={p.weekRows} onAccent={p.isCurrent} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
