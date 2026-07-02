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
  const box =
    "flex flex-col gap-2.5 rounded-[12px] p-3.5 " +
    (layout === "grid"
      ? phase.isCurrent
        ? "mt-3.5 bg-white/70"
        : "mt-3.5 bg-secondary"
      : "bg-white/70");
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

// Phasen einer Journey. Desktop: Raster mit bis zu vier Spalten, jede Karte mit
// Detailzeilen. Mobile: Liste, nur die aktuelle Phase zeigt Details. Optik aus
// V1 (jph): aktuelle Phase akzent-getoent, kuenftige gedimmt.
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
                : "border-[#ececef] bg-card")
            }
          >
            <div className="mb-3">
              <PhaseDot state={p.state} mark={p.mark} />
            </div>
            <div
              className={
                "text-[16px] font-semibold " +
                (p.state === "future" ? "text-[#a0a0a5]" : "text-foreground")
              }
            >
              {p.name}
            </div>
            <div className="mt-0.5 text-[12.5px] text-[#a0a0a5]">{p.meta}</div>
            <DetailRows phase={p} layout="grid" />
          </div>
        ))}
      </div>

      {/* Mobile: Liste, nur die aktuelle Phase aufgeklappt. */}
      <div className="flex flex-col gap-2.5 min-[960px]:hidden">
        {phases.map((p, i) => (
          <div
            key={i}
            className={
              "overflow-hidden rounded-[16px] border " +
              (p.isCurrent
                ? "border-primary/30 bg-primary/10"
                : "border-[#ececef] bg-card")
            }
          >
            <div className="flex items-center gap-3.5 px-4 py-[15px]">
              <PhaseDot state={p.state} mark={p.mark} />
              <div className="min-w-0 flex-1">
                <div
                  className={
                    "text-[15px] font-semibold " +
                    (p.state === "future"
                      ? "text-[#a0a0a5]"
                      : "text-foreground")
                  }
                >
                  {p.name}
                </div>
                <div className="text-[12px] text-[#a0a0a5]">{p.meta}</div>
              </div>
            </div>
            {p.isCurrent && (
              <div className="mx-3.5 mb-3.5">
                <DetailRows phase={p} layout="list" />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
