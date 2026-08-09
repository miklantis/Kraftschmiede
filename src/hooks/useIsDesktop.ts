import { useEffect, useState } from "react";

// Der globale Umschaltpunkt zwischen Handy- und Desktop-Ansicht (960px). Hier
// steht er einmal als Logik fuer JavaScript; im Layout uebernimmt das die
// Tailwind-Variante min-[960px].
export const DESKTOP_QUERY = "(min-width:960px)";

// Einmalige Abfrage ohne Abo – fuer Code ausserhalb von React-Komponenten
// (z. B. den Live-Session-Store). Ausserhalb des Browsers immer false.
export function istDesktopJetzt(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia(DESKTOP_QUERY).matches
  );
}

// Ist die Ansicht Desktop? Fuer Stellen, an denen eine Groesse in JS gebraucht
// wird (z. B. feste Chart-Hoehe), nicht nur in CSS. Wiederverwendbar.
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? istDesktopJetzt() : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (): void => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
