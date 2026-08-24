import { cn } from "@/lib/utils";

// Konto-Kreis: zeigt das Profilbild des Nutzers, solange eines hinterlegt ist,
// sonst den Anfangsbuchstaben auf gruenem Grund. Der Kreis stand vorher an drei
// Stellen von Hand gebaut (Seitenleiste, Kopfzeile mobil, Konto-Karte) - hier
// gibt es ihn genau einmal.
//
// Drei Groessen, passend zu diesen drei Stellen: sm (Seitenleisten-Fuss am
// Desktop), md (Kopfzeile am Handy), lg (Konto-Karte in den Einstellungen).
// Das Bild kommt als Data-URL aus `settings.avatar` (siehe lib/profilbild.ts).
export function Avatar({
  bild,
  initial,
  groesse = "md",
  className,
}: {
  /** Profilbild als Data-URL; Leerstring oder null = kein Bild. */
  bild?: string | null;
  /** Anfangsbuchstabe, der ohne Bild im Kreis steht. */
  initial: string;
  groesse?: "sm" | "md" | "lg";
  className?: string;
}): React.ReactElement {
  const hatBild = typeof bild === "string" && bild.length > 0;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground",
        groesse === "sm" && "size-9 text-sm",
        groesse === "md" && "size-10 text-[15px]",
        groesse === "lg" && "size-11 text-lg",
        className,
      )}
    >
      {hatBild ? (
        <img src={bild} alt="" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
