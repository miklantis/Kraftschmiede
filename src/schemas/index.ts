// Schemas-Barrel: ein Import-Punkt fuer alle Entitaets-Schemas und ihre Typen.
// Beispiel: import { exerciseRow, type ExerciseRow } from "@/schemas";
//
// Die Schemas spiegeln die normalisierte Datenbank 1:1 (siehe shared.ts) und
// sind die Quelle der Wahrheit fuer die Datenformen; TypeScript-Typen werden
// daraus abgeleitet.

export * from "./shared";
export * from "./inventory";
export * from "./exercises";
export * from "./templates";
export * from "./journeyWorkouts";
export * from "./journeyTemplates";
export * from "./skills";
export * from "./journeys";
export * from "./sessions";
export * from "./skillProgress";
export * from "./body";
export * from "./settings";
export * from "./changelog";
