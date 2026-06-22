import type { CatalogSkillView } from "@/hooks/useSkillsView";

// Ein Skill im Katalog: Name, Phasenzahl, Phasen-Chips und ein Knopf zum
// Hinzufuegen (= aktivieren). Bereits aktive Skills zeigen einen ruhenden
// Status statt eines Knopfs. Optik an die Journey-Vorlagenkarte angelehnt.
export function SkillCatalogCard({
  model,
  busy,
  onAdd,
}: {
  model: CatalogSkillView;
  busy: boolean;
  onAdd: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col rounded-[18px] bg-card p-4 shadow-card min-[960px]:p-[22px]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-[16px] font-bold text-foreground min-[960px]:text-[18px]">
          {model.name}
        </span>
        <span className="flex-none rounded-[7px] bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          {model.phaseCount} Phasen
        </span>
      </div>
      {model.phaseLabels.length > 0 && (
        <div className="mb-3.5 flex flex-wrap gap-1.5 min-[960px]:mb-[18px]">
          {model.phaseLabels.map((p, i) => (
            <span
              key={i}
              className="rounded-[7px] bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/80"
            >
              {p}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={busy || model.active}
        onClick={onAdd}
        className={
          "w-full rounded-control py-3 text-sm font-semibold transition-[filter] " +
          (model.active
            ? "cursor-default bg-secondary text-muted-foreground"
            : "bg-primary text-primary-foreground hover:brightness-105 disabled:opacity-60")
        }
      >
        {model.active ? "Aktiv" : "Hinzufügen"}
      </button>
    </div>
  );
}
