import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
    queryKey: ["equipment", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<EquipmentItem[]> => {
      const { data, error } = await supabase
        .from("inventory_equipment")
        .select("key, label, active")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EquipmentItem[];
    },
  });
}

// Schluessel der aktiven Equipment-Eintraege. Dienen als "vorhandenes Geraet"
// fuer das Skill-Equipment-Tor (skillAdvice vergleicht gegen diese Liste).
export function useOwnedEquipmentKeys() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["ownedEquipment", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("inventory_equipment")
        .select("key, active")
        .eq("active", true);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ key: string }>).map((e) => e.key);
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
    queryKey: ["bars", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<BarItem[]> => {
      const { data, error } = await supabase
        .from("inventory_bars")
        .select("id, name, weight, is_default")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as BarItem[];
    },
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
    queryKey: ["plates", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<WeightItem[]> => {
      const { data, error } = await supabase
        .from("inventory_plates")
        .select("id, weight")
        .order("weight", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as WeightItem[];
    },
  });
}

// Verfuegbare Kettlebell-Gewichte, aufsteigend sortiert.
export function useKettlebells() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["kettlebells", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<WeightItem[]> => {
      const { data, error } = await supabase
        .from("inventory_kettlebells")
        .select("id, weight")
        .order("weight", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as WeightItem[];
    },
  });
}

// Verfuegbare Kurzhantel-Gewichte (festes Gewicht je Stueck), aufsteigend sortiert.
export function useDumbbells() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["dumbbells", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<WeightItem[]> => {
      const { data, error } = await supabase
        .from("inventory_dumbbells")
        .select("id, weight")
        .order("weight", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as WeightItem[];
    },
  });
}
