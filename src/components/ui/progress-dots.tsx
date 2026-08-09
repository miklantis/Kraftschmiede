import { cn } from "@/lib/utils";

// Punktreihe fuer Fortschritt (z. B. Einheiten der Woche). filled Punkte in
// Akzentfarbe, die uebrigen gedeckt. Wird auch auf der Journey-Seite genutzt.
export function ProgressDots({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}): React.ReactElement {
  const count = Math.max(0, total);
  const on = Math.max(0, Math.min(filled, count));
  return (
    <div className={cn("flex flex-none gap-1 min-[960px]:gap-[5px]", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-[7px] rounded-full min-[960px]:size-2",
            i < on ? "bg-primary" : "bg-marker-idle",
          )}
        />
      ))}
    </div>
  );
}
