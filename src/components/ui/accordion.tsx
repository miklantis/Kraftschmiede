import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Aufklappbare Karte: ein klickbarer Kopf mit Chevron rechts, darunter der
// einklappbare Inhalt. Eigene Offen-Zustaende je Eintrag (unkontrolliert mit
// optionalem Startwert). Generisch und domaenenfrei – nutzbar fuer Skills und
// spaeter Uebungen/Verlauf. Optik: weisse Karte, weicher Schatten, Radius 16px.
export function AccordionItem({
  header,
  children,
  defaultOpen = false,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] bg-card shadow-card",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-[15px] text-left min-[960px]:px-[18px] min-[960px]:py-4"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown
          size={20}
          className={cn(
            "flex-none text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div id={bodyId} className="border-t border-[#ececef] px-4 py-3.5 min-[960px]:px-[18px]">
          {children}
        </div>
      )}
    </div>
  );
}
