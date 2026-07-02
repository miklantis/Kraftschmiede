import type { PhaseState } from "@/lib/journey";

// Runder Statuspunkt je Phase. Vergangen: dunkelgrau mit Haken; aktuell:
// Akzentgruen mit weissem Innenpunkt; kuenftig: hellgrau mit weissem Innenpunkt.
// Farben 1:1 aus V1 (jph-dot: --text2 / accent / #d8d8dc).
export function PhaseDot({
  state,
  mark,
}: {
  state: PhaseState;
  mark: string;
}): React.ReactElement {
  const base =
    "flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold text-white";
  if (state === "current") {
    return (
      <span className={base + " bg-primary"}>
        <span className="size-2.5 rounded-full bg-white" />
      </span>
    );
  }
  if (state === "future") {
    return (
      <span className={base + " bg-[#d8d8dc]"}>
        <span className="size-2.5 rounded-full bg-white" />
      </span>
    );
  }
  return <span className={base + " bg-[#5c5c61]"}>{mark}</span>;
}
