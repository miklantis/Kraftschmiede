import { useEffect, useState } from "react";

// Ist die Ansicht Desktop (>=960px, der globale Umschaltpunkt)? Fuer Stellen,
// an denen eine Groesse in JS gebraucht wird (z. B. feste Chart-Hoehe), nicht
// nur in CSS. Wiederverwendbar.
export function useIsDesktop(): boolean {
  const query = "(min-width:960px)";
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (): void => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
