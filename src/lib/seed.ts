// Anstoss der Erstbefuellung: waehlt den echten Speicher und spielt die
// Abfolge ab. Mehr steht hier nicht mehr - was ein neues Konto bekommt und in
// welcher Reihenfolge, liegt in `seedWrite.ts`, die Datenbank-Handgriffe
// dazu in `seedStore.ts` (ADR-0019). Diese Datei kennt Supabase nicht.
//
// Aufgerufen wird sie beim App-Start ueber `SeedBootstrap` - einmal je Konto,
// idempotent: ein zweiter Lauf legt nichts erneut an.

import { supabaseSeedStore } from "@/lib/seedStore";
import { writeSeed } from "@/lib/seedWrite";
import type { SeedErgebnis } from "@/lib/seedWrite";

export type { SeedErgebnis };

export function ensureDefinitionsSeeded(
  userId: string,
): Promise<SeedErgebnis> {
  return writeSeed(supabaseSeedStore, userId);
}
