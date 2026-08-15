// Titelzeile eines Skill-Blocks: Name, direkt daneben der aktuelle Phasenname
// klein und grau. Bewusst gemeinsam genutzt von der Skill-Liste auf der
// Trainingsseite und dem Kopf der Skill-Karte, damit beide Stellen gleich
// aussehen. Darunter steht in beiden Faellen nur noch der Phasen-Balken - die
// Darstellung bleibt so zweizeilig.
export function SkillTitle({
  name,
  phaseLabel,
}: {
  name: string;
  phaseLabel: string;
}): React.ReactElement {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="min-w-0 shrink-[2] truncate text-[17px] font-semibold text-foreground min-[960px]:text-[15px]">
        {name}
      </span>
      {phaseLabel !== "" && (
        <span className="min-w-0 shrink-[3] truncate text-[13px] text-muted-foreground">
          {phaseLabel}
        </span>
      )}
    </div>
  );
}
