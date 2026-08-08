import type { ReactNode } from "react";

// Kopfkarte einer Journey: grosser Name, Meta-Zeile und optional eine Aktion
// rechts. Herausgezogen aus ActiveJourneyCard, damit die Rueckschau einer
// archivierten Journey exakt dieselbe Optik nutzt (V1 jr-active).
export function JourneyHeadCard({
  name,
  metaLine,
  action,
}: {
  name: string;
  metaLine: string;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card bg-card px-5 py-[18px] shadow-card min-[960px]:px-6 min-[960px]:py-[22px]">
      <div className="min-w-0">
        <div className="truncate text-[22px] font-bold text-foreground min-[960px]:text-[26px]">
          {name}
        </div>
        {metaLine !== "" && (
          <div className="mt-1 truncate text-[13px] text-muted-foreground min-[960px]:text-[14px]">
            {metaLine}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
