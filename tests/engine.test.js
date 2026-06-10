/* Kraftschmiede – Engine-Test: Volumensteuerung & Deload.
   Lauf: node tests/engine.test.js  (keine Abhaengigkeiten, vom Projekt-Root).
   Sichert ab, dass deloadWeek 1-basiert interpretiert wird:
   "Deload-Woche N" senkt das Volumen genau in der N-ten Woche der Phase. */
"use strict";
var E = require("../js/engine.js");

var fails = 0;
function eq(got, want, msg) {
  if (got === want) { console.log("OK   " + msg + " (= " + got + ")"); }
  else { fails++; console.log("FAIL " + msg + " -> erwartet " + want + ", erhalten " + got); }
}

/* Phase A: 6 Wochen, Satz-Rampe 3..6, Deload in Woche 6 (letzte Woche). */
var A = { setsStart: 3, setsEnd: 6, weeks: 6, deloadWeek: 6 };
eq(E.volumeForWeek(A, 4, true), 5, "A W5 (Rampe vor Deload)");
eq(E.volumeForWeek(A, 5, true), 4, "A W6 Deload greift (75% der Vorwoche, < Rampe 6)");

/* Phase B: 5 Wochen, Satz-Rampe 2..4, Deload in Woche 4 (vorletzte Woche). */
var B = { setsStart: 2, setsEnd: 4, weeks: 5, deloadWeek: 4 };
eq(E.volumeForWeek(B, 3, true), 2, "B W4 Deload greift");
eq(E.volumeForWeek(B, 4, true), 4, "B W5 wieder volle Rampe (nicht Deload)");

/* Erholungsmarker rot: Basiswoche -1 (nicht unter setsStart), Deload-Woche unberuehrt. */
eq(E.volumeForWeek(B, 4, false), 3, "B W5 mit roten Markern konservativ (-1)");
eq(E.volumeForWeek(B, 3, false), 2, "B W4 Deload bleibt von Markern unberuehrt");

/* Phase ohne Deload: keine Senkung, Rampe steigt. */
var C = { setsStart: 2, setsEnd: 4, weeks: 4, deloadWeek: null };
eq(E.volumeForWeek(C, 0, true), 2, "C W1 Start");
eq(E.volumeForWeek(C, 3, true), 4, "C W4 Ende (keine Deload-Senkung)");

/* ===== Skills (skillSetMet / skillSessionResult / skillAdvice) ===== */

/* skillSetMet: reps/duration, nicht-done, unbekannte Metrik */
eq(E.skillSetMet("reps", 5, { value: 6, done: true }), true, "Set reps erfuellt (6>=5)");
eq(E.skillSetMet("reps", 5, { value: 5, done: true }), true, "Set reps genau am Ziel (5>=5)");
eq(E.skillSetMet("reps", 5, { value: 4, done: true }), false, "Set reps unter Ziel (4<5)");
eq(E.skillSetMet("reps", 5, { value: 9, done: false }), false, "Set nicht abgehakt -> nicht erfuellt");
eq(E.skillSetMet("duration", 30, { value: 30, done: true }), true, "Set duration am Ziel (30>=30)");
eq(E.skillSetMet("duration", 30, { value: 20, done: true }), false, "Set duration unter Ziel (20<30)");
eq(E.skillSetMet("distance", 4, { value: 99, done: true }), false, "unbekannte Metrik defensiv false");

/* skillSessionResult – einfache Phase (eine Uebung, 3 Saetze, Ziel 8 reps) */
var P1 = [{ metric: "reps", target: 8, sets: 3 }];
eq(E.skillSessionResult(P1, [{ sets: [ {value:8,done:true},{value:9,done:true},{value:8,done:true} ] }]),
   "completed", "Result completed (alle 3 done & im Ziel)");
eq(E.skillSessionResult(P1, [{ sets: [ {value:8,done:true},{value:5,done:true},{value:8,done:true} ] }]),
   "missed", "Result missed (1 Satz unter Ziel)");
eq(E.skillSessionResult(P1, [{ sets: [ {value:8,done:true},{value:8,done:true} ] }]),
   "missed", "Result missed (nur 2 von 3 Saetzen done)");
eq(E.skillSessionResult(P1, [{ sets: [ {value:null,done:false},{value:null,done:false},{value:null,done:false} ] }]),
   "skipped", "Result skipped (kein Satz done)");

/* skillSessionResult – gemischte Phase (Pull-Up Phase 0: duration + reps) */
var Pmix = [{ metric: "duration", target: 30, sets: 3 }, { metric: "reps", target: 5, sets: 3 }];
eq(E.skillSessionResult(Pmix, [
     { sets: [ {value:30,done:true},{value:32,done:true},{value:31,done:true} ] },   // Dead Hang ok
     { sets: [ {value:5,done:true},{value:6,done:true},{value:5,done:true} ] }        // Scapular ok
   ]), "completed", "Mixed completed (beide Uebungen voll im Ziel)");
eq(E.skillSessionResult(Pmix, [
     { sets: [ {value:30,done:true},{value:30,done:true},{value:30,done:true} ] },   // Dead Hang ok
     { sets: [ {value:5,done:true},{value:3,done:true},{value:5,done:true} ] }        // Scapular ein Satz daneben
   ]), "missed", "Mixed missed (eine Uebung erfuellt, andere nicht)");

/* skillSessionResult – robust gegen vorab auf done gefilterte Saetze */
eq(E.skillSessionResult(P1, [{ sets: [ {value:8,done:true},{value:8,done:true},{value:9,done:true} ] }]),
   "completed", "Result completed (gefilterte done-Saetze)");

/* skillAdvice – Equipment-Tor, Aufstiegsreife, Phasen-Clamp, Meisterung */
var pull = {
  phases: [
    { index:0, equipment:["pullup-bar"],               consecutiveSessions:2, exercises:[{}] },
    { index:1, equipment:["pullup-bar","band-light"],  consecutiveSessions:2, exercises:[{}] }
  ]
};
var advHave = E.skillAdvice(pull, { currentPhase:0, consecutiveCount:0 }, ["pullup-bar"]);
eq(advHave.equipmentMissing, false, "skillAdvice: Phase 0 Equipment vorhanden");
eq(advHave.phaseIndex, 0, "skillAdvice: phaseIndex 0");

var advMiss = E.skillAdvice(pull, { currentPhase:1, consecutiveCount:0 }, ["pullup-bar"]);
eq(advMiss.equipmentMissing, true, "skillAdvice: Phase 1 Band fehlt -> Tor");
eq(advMiss.missingEquipment.join(","), "band-light", "skillAdvice: fehlende ID gemeldet");

eq(E.skillAdvice(pull, { currentPhase:0, consecutiveCount:1 }, ["pullup-bar"]).readyToAdvance, true,
   "skillAdvice: readyToAdvance (count+1>=need)");
eq(E.skillAdvice(pull, { currentPhase:0, consecutiveCount:0 }, ["pullup-bar"]).readyToAdvance, false,
   "skillAdvice: noch nicht aufstiegsreif");

var advClamp = E.skillAdvice(pull, { currentPhase:9, consecutiveCount:0, mastered:true }, ["pullup-bar","band-light"]);
eq(advClamp.phaseIndex, 1, "skillAdvice: currentPhase ueber Ende -> clamp auf letzte Phase");
eq(advClamp.mastered, true, "skillAdvice: mastered durchgereicht");
eq(advClamp.readyToAdvance, false, "skillAdvice: mastered nicht mehr aufstiegsreif");

/* loadForReps – invertierte Epley-Naeherung */
eq(E.loadForReps(100, 1), 100, "loadForReps: 1 Wdh = 1RM");
eq(E.loadForReps(0, 5), 0, "loadForReps: ohne 1RM = 0");
eq(Math.round(E.loadForReps(100, 5)), 86, "loadForReps: 5 Wdh ~ 86% 1RM");

/* workWeightForPhase – Phasenwechsel auf neue Repband-Zone (bar 20, Schritt 2,5) */
var WP = { bar: { weight: 20 }, plates: [1.25, 2.5, 5, 10, 15, 20, 25] };
function wpOpts(cur, extra) { var o = { bar: WP.bar, plates: WP.plates, currentWeight: cur }; for (var k in (extra||{})) o[k]=extra[k]; return o; }

// kein 1RM -> Gewicht halten
var wHold = E.workWeightForPhase(null, [8, 12], wpOpts(70));
eq(wHold.decision, "hold", "Phase: ohne 1RM halten");
eq(wHold.weight, 70, "Phase: ohne 1RM Gewicht unveraendert");

// Kraft -> Hypertrophie: altes Gewicht zu schwer -> senken (direkt)
var wLow = E.workWeightForPhase(100, [8, 12], wpOpts(85));
eq(wLow.decision, "lower", "Phase: zu schwere Altlast wird gesenkt");
eq(wLow.weight, 67.5, "Phase: gesenkt auf oberes Zonenende (~14 Wdh, abgerundet)");

// Hypertrophie -> Kraft: leichtes Gewicht, Sprung nach oben gedeckelt
var wCap = E.workWeightForPhase(100, [4, 6], wpOpts(60));
eq(wCap.decision, "raise", "Phase: Aufwaertswechsel angehoben");
eq(wCap.weight, 65, "Phase: Anhebung auf +12% gedeckelt (60 -> 65)");

// Hypertrophie -> Kraft ohne Deckel-Eingriff: Zielzone unter dem Deckel
var wUp = E.workWeightForPhase(100, [4, 6], wpOpts(75));
eq(wUp.decision, "raise", "Phase: Aufwaertswechsel ohne Deckel");
eq(wUp.weight, 77.5, "Phase: gepuffert auf oberes Kraft-Zonenende (~8 Wdh)");

// bereits passend -> halten
var wKeep = E.workWeightForPhase(100, [8, 12], wpOpts(67.5));
eq(wKeep.decision, "hold", "Phase: bereits passend -> halten");
eq(wKeep.weight, 67.5, "Phase: Gewicht bleibt");

console.log(fails ? ("\n" + fails + " Test(s) fehlgeschlagen.") : "\nAlle Tests gruen.");
process.exit(fails ? 1 : 0);
