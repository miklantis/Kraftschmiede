import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";

export interface EquipmentItem {
  key: string;
  label: string;
  active: boolean;
}

// Alle Equipment-Eintraege (Schluessel, Anzeigename, aktiv). Grundlage fuer
// Tor-Hinweise (fehlende Geraete als Labels) und spaeter den Geraete-Schalter.
export function useEquipment() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.equipment(userId),
    enabled: userId !== null,
    queryFn: (): Promise<EquipmentItem[]> =>
      leseZeilen<EquipmentItem>({
        tabelle: "inventory_equipment",
        spalten: "key, label, active",
        sortierung: [{ spalte: "position" }],
      }),
  });
}

// Schluessel der aktiven Equipment-Eintraege. Dienen als "vorhandenes Geraet"
// fuer das Skill-Equipment-Tor (skillAdvice vergleicht gegen diese Liste).
export function useOwnedEquipmentKeys() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.ownedEquipment(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<string[]> => {
      const rows = await leseZeilen<{ key: string }>({
        tabelle: "inventory_equipment",
        spalten: "key, active",
        gleich: { active: true },
      });
      return rows.map((e) => e.key);
    },
  });
}

// Stangen (Langhantel-Typen), nach position sortiert. id+name+weight fuer Liste
// und Loeschen; is_default markiert die Standardstange.
export interface BarItem {
  id: string;
  name: string;
  weight: number;
  is_default: boolean;
}
export function useBars() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.bars(userId),
    enabled: userId !== null,
    queryFn: (): Promise<BarItem[]> =>
      leseZeilen<BarItem>({
        tabelle: "inventory_bars",
        spalten: "id, name, weight, is_default",
        sortierung: [{ spalte: "position" }],
      }),
  });
}

// Verfuegbare Scheiben-Typen (Gewicht), aufsteigend sortiert. id zum Loeschen.
export interface WeightItem {
  id: string;
  weight: number;
}
export function usePlates() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.plates(userId),
    enabled: userId !== null,
    queryFn: (): Promise<WeightItem[]> =>
      leseZeilen<WeightItem>({
        tabelle: "inventory_plates",
        spalten: "id, weight",
        sortierung: [{ spalte: "weight" }],
      }),
  });
}

// Verfuegbare Kettlebell-Gewichte, aufsteigend sortiert.
export function useKettlebells() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.kettlebells(userId),
    enabled: userId !== null,
    queryFn: (): Promise<WeightItem[]> =>
      leseZeilen<WeightItem>({
        tabelle: "inventory_kettlebells",
        spalten: "id, weight",
        sortierung: [{ spalte: "weight" }],
      }),
  });
}

// Verfuegbare Kurzhantel-Gewichte (festes Gewicht je Stueck), aufsteigend sortiert.
export function useDumbbells() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.dumbbells(userId),
    enabled: userId !== null,
    queryFn: (): Promise<WeightItem[]> =>
      leseZeilen<WeightItem>({
        tabelle: "inventory_dumbbells",
        spalten: "id, weight",
        sortierung: [{ spalte: "weight" }],
      }),
  });
}
