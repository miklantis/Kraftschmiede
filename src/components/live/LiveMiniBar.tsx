import { ChevronUp } from "lucide-react";

// Freischwebende Mini-Pille unten mittig (Desktop, eingeklappt). Tippen faehrt
// das Panel wieder hoch. Optik 1:1 aus V1 (live.js liveMiniBar): dunkle Pille,
// gruener Punkt, Titel + Unterzeile, mitlaufende Uhr, Pfeil nach oben.
export function LiveMiniBar({
  title,
  subtitle,
  clock,
  onExpand,
}: {
  title: string;
  subtitle: string;
  clock: string;
  onExpand: () => void;
}): React.ReactElement {
  return (
    <div
      className="kl-mini"
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExpand();
      }}
    >
      <span className="kl-mini-dot" />
      <div className="kl-mini-mid">
        <div className="kl-mini-title">{title}</div>
        <div className="kl-mini-sub">{subtitle}</div>
      </div>
      <span className="kl-mini-clock">{clock}</span>
      <ChevronUp className="size-4 flex-none text-white" strokeWidth={2.2} />
    </div>
  );
}
