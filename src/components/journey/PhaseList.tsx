import { PhaseDot } from "./PhaseDot";
import type { PhaseView } from "@/lib/journey";

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

// Hinweiskasten an der laufenden Phase: vorgegebene Last (Lastfaktor-Journeys)
// bzw. Ablauf der Kombiwoche. Erklaert den bewusst niedrigen Vorschlag, das Ende
// der Vorgabe oder die Woche aus Entlastung, Pause und 1RM-Test.
function LoadNote({ text }: { text: string }): React.ReactElement {
  return (
    <div className="rounded-[12px] border border-primary/25 bg-white/70 px-3 py-2 text-[12.5px] leading-snug text-foreground">
      {text}
    </div>
  );
}

// Phasen einer Journey. Desktop: Raster mit bis zu vier Spalten, jede Karte mit
// Detailzeilen. Mobile: Liste, nur die aktuelle Phase zeigt Details. Optik aus
// V1 (jph): aktuelle Phase akzent-getoent, kuenftige gedimmt.
//
// variant "preview" ist die Vorlagenliste: dort laeuft keine Journey, also gibt
// es keine aufgeklappte aktuelle Phase - auf Mobile zeigen deshalb alle Phasen
// ihre Detailzeilen.
export function PhaseList({
  phases,
  variant = "journey",
}: {
  phases: PhaseView[];
  variant?: "journey" | "preview";
}): React.ReactElement {
  const expandAll = variant === "preview";
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
            {p.comboNote !== null && (
              <div className="mt-3.5">
                <LoadNote text={p.comboNote} />
              </div>
            )}
            <DetailRows phase={p} layout="grid" />
          </div>
        ))}
      </div>

      {/* Mobile: Liste; in der Journey nur die aktuelle Phase aufgeklappt, in der
          Vorschau alle. */}
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
            {(p.isCurrent || expandAll) && (
              <div className="mx-3.5 mb-3.5">
                {p.loadNote !== null && (
                  <div className="mb-2.5">
                    <LoadNote text={p.loadNote} />
                  </div>
                )}
                {p.comboNote !== null && (
                  <div className="mb-2.5">
                    <LoadNote text={p.comboNote} />
                  </div>
                )}
                <DetailRows phase={p} layout="list" />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
