import type { PhaseState } from "@/lib/journey";

// Runder Statuspunkt je Phase. Vergangen: dunkelgrau mit Haken; aktuell:
// Akzentgruen mit weissem Innenpunkt; kuenftig und Vorschau (Vorlagenliste,
// ohne laufende Journey): hellgrau mit weissem Innenpunkt.
// Farben ueber Tokens (--foreground-secondary / --primary / --marker-idle).
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
  if (state === "future" || state === "preview") {
    return (
      <span className={base + " bg-marker-idle"}>
        <span className="size-2.5 rounded-full bg-white" />
      </span>
    );
  }
  return <span className={base + " bg-foreground-secondary"}>{mark}</span>;
}
