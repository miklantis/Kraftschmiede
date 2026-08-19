import { useMemo } from "react";
import { useAllRmTests } from "./useRmTests";

// Datum jedes abgeschlossenen 1RM-Tests, aufsteigend. Eine Kalenderwoche mit
// Test gilt als erfuellt, unabhaengig von der Einheitenzahl: die Testwoche der
// Testphase plant keine Einheit, das Wochenziel sind drei - ohne diese Regel
// bliebe die Journey dort haengen (Issue #225, Schritt 4 / #229).
//
// Eine Stelle statt in jedem Hook: die Platzierung muss ueberall dieselbe sein,
// sonst zeigt die Uebungsseite eine andere Woche als die gestartete Einheit.
export function useTestDates(): string[] {
  const q = useAllRmTests();
  const rows = q.data;
  return useMemo(
    () =>
      (rows ?? [])
        .map((t) => t.date)
        .filter((d): d is string => typeof d === "string" && d !== "")
        .sort(),
    [rows],
  );
}
