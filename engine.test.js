/* Kraftschmiede – Engine-Test: Volumensteuerung & Deload.
   Lauf: node engine.test.js  (keine Abhaengigkeiten).
   Sichert ab, dass deloadWeek 1-basiert interpretiert wird:
   "Deload-Woche N" senkt das Volumen genau in der N-ten Woche der Phase. */
"use strict";
var E = require("./engine.js");

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

console.log(fails ? ("\n" + fails + " Test(s) fehlgeschlagen.") : "\nAlle Tests gruen.");
process.exit(fails ? 1 : 0);
