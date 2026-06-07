/* Kraftschmiede – data.js (Schema 0.14). Vanilla JS, framework-frei.
   Seed-Daten, Domaenen-Helfer (Uebungen/Templates/Phasen), kuratierte
   Journey-Vorlagen und die Schema-Migration. Aus app.js ausgelagert.
   Greift ueber window.KS nur auf SCHEMA und today() zu (beides aus app.js,
   dort frueh exportiert, da seed()/migrate() bereits beim Init laufen).
   Reine Datenschicht: keine DOM-, Engine- oder Sync-Abhaengigkeit. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});

  /* duenner Wrapper auf geteilten Helfer aus app.js (window.KS) */
  function today() { return KS.today(); }

  /* =========================================================
     Seed-Daten + Domaenen-Helfer
     ========================================================= */
  function seed() {
    return {
      schemaVersion: KS.SCHEMA,
      settings: {
        rmFormula: "mean",
        recoveryWindows: { default: 48, squat: 48, deadlift: 72 },
        weeklyFrequencyTarget: 3,
        step: 2.5,
        unit: "kg",
        timers: { setRestSec: 120, exerciseRestSec: 180, autoStart: true, sound: true, vibrate: true }
      },
      inventory: {
        bars: [
          { id: "bar_std", name: "Standard", weight: 20, default: true },
          { id: "bar_short", name: "Kurz / Leicht", weight: 15, default: false }
        ],
        plates: [1.25, 2.5, 5, 10, 15, 20, 25]
      },
      exercises: [
        ex("back_squat", "Back Squat", "strength", "lift1", "bar_std", ["legs", "glutes"], [6, 10], 40, 48),
        ex("bench_press", "Bench Press", "strength", "lift2", "bar_std", ["chest", "triceps", "shoulders"], [8, 12], 30),
        ex("deadlift", "Deadlift", "strength", "lift1", "bar_std", ["back", "legs", "glutes"], [4, 8], 50, 72),
        ex("bent_row", "Bent Row", "strength", "lift2", "bar_std", ["back", "biceps"], [8, 12], 30),
        ex("push_press", "Push Press", "strength", "lift1", "bar_std", ["shoulders", "triceps"], [5, 10], 25),
        ex("barbell_curl", "Barbell Curl", "strength", "lift2", "bar_std", ["biceps"], [8, 12], 20),
        core("plate_situps", "Plate Situps", [12, 20], 5),
        core("plate_twist", "Plate Twist", [12, 20], 5),
        core("plate_cocoon", "Plate Cocoon", [10, 16], 5),
        ex("lunge", "Lunge", "strength", "lift1", "bar_std", ["legs", "glutes"], [8, 12], 30, 48, false),
        ex("pull_over", "Pull Over", "strength", "lift2", "bar_std", ["back", "chest"], [8, 12], 20, 48)
      ],
      templates: [
        tpl("t_a", "A", "back_squat", "bench_press", "plate_situps"),
        tpl("t_b", "B", "deadlift", "bent_row", "plate_twist"),
        tpl("t_c", "C", "back_squat", "push_press", "pull_over"),
        tpl("t_d", "D", "deadlift", "barbell_curl", "plate_situps"),
        tpl("t_e", "E", "push_press", "barbell_curl", "pull_over"),
        tpl("t_f", "F", "bench_press", "bent_row", "plate_cocoon")
      ],
      journeys: [
        {
          id: "j_2026_aufbau", name: "Aufbau 2026", active: true, templateId: "reentry_build",
          startDate: today(),
          phases: [
            phase("p0", "Wiedereinstieg", "reentry", 2, 2, 2, null),
            phase("p1", "Hypertrophie", "hypertrophy", 5, 2, 6, 4),
            phase("p2", "Maximalkraft", "strength", 5, 3, 5, 4),
            phase("p3", "Übergang / Test", "test", 1, 2, 2, null)
          ]
        }
      ],
      sessions: [],
      bodyLog: []
    };
  }
  // Funktions-Kategorie einer Uebung (was sie ist), unabhaengig von der Position im Workout.
  // Initialklassifikation der bekannten Uebungen; eigene/unbekannte defaulten auf "main".
  function kindOf(id, profile) {
    if (profile === "core") return "core";
    if (id === "barbell_curl" || id === "pull_over") return "accessory";
    return "main";
  }
  function kindLabel(k) { return ({ main: "Hauptübung", accessory: "Assistenz", core: "Core" })[k] || k || "–"; }
  function ex(id, name, profile, slot, barId, mg, repRange, w, rec, active) {
    return {
      id: id, name: name, category: profile === "core" ? "core" : "barbell",
      profile: profile, kind: kindOf(id, profile), equipment: "barbell", barId: barId,
      metrics: ["weight", "reps", "volume", "score", "est1RM"],
      muscleGroups: mg, repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: rec || 48, rm: null, rmAsOf: null, rmStale: false,
      active: active === false ? false : true
    };
  }
  function core(id, name, repRange, w) {
    return {
      id: id, name: name, category: "core", profile: "core", kind: "core",
      equipment: "plate", barId: null, metrics: ["weight", "reps", "volume", "score"],
      muscleGroups: ["core"], repRange: repRange, targetScore: 3, workWeight: w,
      recoveryHours: 24, rm: null, rmAsOf: null, rmStale: false, active: true
    };
  }
  function tpl(id, name, l1, l2, c, image) {
    var items = [];
    if (l1) items.push({ exerciseId: l1, role: "primary" });
    if (l2) items.push({ exerciseId: l2, role: "secondary" });
    if (c) items.push({ exerciseId: c, role: "core" });
    // image: Dateiname des Vorschaubilds (im images/-Ordner). Frei waehlbar und
    // pro Template ueberschreibbar; Default leitet sich nur bequemerweise aus dem Namen ab.
    return { id: id, name: name, items: items, image: image || ("Workout " + name + ".jpeg") };
  }
  function phase(id, name, focus, weeks, s0, s1, dl, rt) {
    return { id: id, name: name, focus: focus, weeks: weeks, setsStart: s0, setsEnd: s1, deloadWeek: dl, repTarget: rt || repTargetForFocus(focus) };
  }
  // Phasen-Fokus -> Ziel-Wiederholungsband (steuert Doppelprogression im Training).
  function repTargetForFocus(focus) {
    switch (focus) {
      case "reentry": return [5, 8];
      case "hypertrophy": return [8, 12];
      case "strength": return [4, 6];
      case "power": return [3, 5];
      case "endurance": return [12, 18];
      case "test": return [2, 4];
      default: return null; // maintenance/unbekannt -> Übungs-repRange
    }
  }
  function focusLabel(f) {
    return ({ reentry: "Wiedereinstieg", hypertrophy: "Hypertrophie", strength: "Maximalkraft", power: "Schnellkraft", endurance: "Kraftausdauer", test: "Test/Peak", maintenance: "Erhaltung" })[f] || f;
  }

  /* Kuratierte Journey-Vorlagen. Phasen: n=Name f=Fokus w=Wochen s0/s1=Satz-Rampe dl=Deload-Woche rt=Repband */
  var JOURNEY_TEMPLATES = [
    {
      id: "reentry_build", name: "Wiedereinstieg & Aufbau",
      tagline: "Sauber zurück und systematisch zu mehr Kraft",
      forWhom: "Nach Pause, Verletzung oder als Einstieg ins strukturierte Langhanteltraining.",
      summary: "Beginnt bewusst leicht, um Technik und Belastbarkeit aufzubauen, steigert dann Volumen für Muskelaufbau, schaltet auf Maximalkraft um und schließt mit einer Testwoche für neue Bestwerte.",
      phases: [
        { n: "Wiedereinstieg", f: "reentry", w: 2, s0: 2, s1: 2, dl: null, rt: [5, 8] },
        { n: "Hypertrophie", f: "hypertrophy", w: 5, s0: 2, s1: 6, dl: 4, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 5, s0: 3, s1: 5, dl: 4, rt: [4, 6] },
        { n: "Übergang / Test", f: "test", w: 1, s0: 2, s1: 2, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "hypertrophy_block", name: "Hypertrophie-Block",
      tagline: "Maximaler Muskelaufbau über höheres Volumen",
      forWhom: "Grundtechnik sitzt, Ziel ist Muskelmasse. Setzt regelmäßiges Training voraus.",
      summary: "Zwei Akkumulationsblöcke mit ansteigendem Volumen im Bereich 8–12 Wiederholungen, getrennt durch eine Entlastung. Fokus auf Reizsetzung und Wachstum, ohne in den schweren Maximalkraftbereich zu gehen.",
      phases: [
        { n: "Akkumulation I", f: "hypertrophy", w: 4, s0: 3, s1: 6, dl: null, rt: [8, 12] },
        { n: "Deload", f: "maintenance", w: 1, s0: 2, s1: 2, dl: 1, rt: [8, 10] },
        { n: "Akkumulation II", f: "hypertrophy", w: 4, s0: 4, s1: 6, dl: 4, rt: [8, 12] }
      ]
    },
    {
      id: "strength_peak", name: "Maximalkraft / Peaking",
      tagline: "Schwere Lasten, gezielt zum 1RM",
      forWhom: "Fortgeschritten, Technik stabil. Ziel ist messbar mehr Kraft auf den Hauptübungen.",
      summary: "Baut eine Kraftbasis im Bereich 4–6 Wiederholungen, intensiviert auf 3–5 mit höherer Last und reduziertem Volumen und gipfelt in einer Peak- und Testphase für neue Maxima.",
      phases: [
        { n: "Kraftbasis", f: "strength", w: 4, s0: 3, s1: 5, dl: null, rt: [4, 6] },
        { n: "Intensivierung", f: "power", w: 3, s0: 3, s1: 4, dl: 3, rt: [3, 5] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "conditioning", name: "Kraftausdauer / Kondition",
      tagline: "Work Capacity und allgemeine Fitness",
      forWhom: "Wer Ausdauer in der Kraft, höhere Wiederholungen und Konditionierung sucht.",
      summary: "Höhere Wiederholungszahlen (12–18) bei kürzeren Pausen über zwei Blöcke. Verbessert muskuläre Ausdauer und Belastungstoleranz, gute Brücke zu funktionellem Training und Kettlebell-Arbeit.",
      phases: [
        { n: "Aufbau Kapazität", f: "endurance", w: 3, s0: 3, s1: 5, dl: null, rt: [12, 18] },
        { n: "Verdichtung", f: "endurance", w: 3, s0: 4, s1: 6, dl: 3, rt: [12, 15] }
      ]
    },
    {
      id: "maintenance", name: "Erhaltung / Minimaldosis",
      tagline: "Form halten mit wenig Zeit",
      forWhom: "Stressige Phasen, Reisen, wenig Zeit. Ziel ist Erhalt statt Fortschritt.",
      summary: "Konstantes, geringes Volumen ohne Progressionsdruck. Hält Kraft und Technik mit minimalem Aufwand. Beliebig wiederholbar, bis wieder ein Aufbau- oder Kraftblock ansteht.",
      phases: [
        { n: "Erhaltung", f: "maintenance", w: 4, s0: 2, s1: 2, dl: null, rt: [6, 10] }
      ]
    },
    {
      id: "block_3m", name: "3-Monats-Block (Aufbau → Kraft)",
      tagline: "Rund 3 Monate: erst Masse, dann Kraft, dann Test",
      forWhom: "Solide Grundlage vorhanden, klares Quartalsziel. Regelmäßiges Training über drei Monate.",
      summary: "Ein kompletter Quartalszyklus: ein Hypertrophie-Block für Muskelmasse, ein Maximalkraft-Block für Last und eine kurze Peak- und Testphase. Jeweils mit Entlastungswoche, sodass der Fortschritt planbar bleibt.",
      phases: [
        { n: "Hypertrophie", f: "hypertrophy", w: 6, s0: 3, s1: 6, dl: 6, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 5, s0: 3, s1: 5, dl: 5, rt: [4, 6] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    },
    {
      id: "periodized_6m", name: "6-Monats-Periodisierung",
      tagline: "Rund 6 Monate: langfristiger, blockweiser Aufbau",
      forWhom: "Wer langfristig plant und über ein halbes Jahr strukturiert auf deutlich mehr Kraft und Masse hinarbeiten will.",
      summary: "Ein langfristiger Plan über sechs Monate: sanfter Einstieg, zwei Hypertrophie-Blöcke und zwei Kraftblöcke im Wechsel, abgeschlossen durch eine Peak- und Testphase. Mehrere Entlastungswochen halten die Belastung nachhaltig.",
      phases: [
        { n: "Wiedereinstieg", f: "reentry", w: 2, s0: 2, s1: 2, dl: null, rt: [5, 8] },
        { n: "Hypertrophie I", f: "hypertrophy", w: 5, s0: 3, s1: 6, dl: 5, rt: [8, 12] },
        { n: "Kraft I", f: "strength", w: 4, s0: 3, s1: 5, dl: 4, rt: [4, 6] },
        { n: "Hypertrophie II", f: "hypertrophy", w: 5, s0: 4, s1: 6, dl: 5, rt: [8, 12] },
        { n: "Maximalkraft", f: "strength", w: 6, s0: 3, s1: 5, dl: 6, rt: [3, 5] },
        { n: "Peak & Test", f: "test", w: 2, s0: 2, s1: 3, dl: null, rt: [2, 4] }
      ]
    }
  ];
  function templateWeeks(t) { return t.phases.reduce(function (a, p) { return a + p.w; }, 0); }

  /* =========================================================
     Journey-Fortschritt – trainingsgetrieben ueber Kalenderwochen.
     Eine ISO-Kalenderwoche gilt als erfuellt, wenn darin mindestens
     freqTarget abgeschlossene Krafteinheiten der Journey liegen
     (Yoga und Skills zaehlen nicht). Aktuelle Phase/Woche werden daraus
     abgeleitet, nicht von Hand gesetzt. Keine Pausenlogik: eine Woche
     ohne genug Einheiten zaehlt einfach nicht und schiebt nichts.
     Reine Funktionen: Sessions/Phasen/freqTarget als Argumente, kein
     DB-Zugriff (heute nur ueber KS.today() fuer die laufende Woche).
     ========================================================= */
  // ISO-8601-Wochenschluessel "YYYY-Www" zu einem Datum "YYYY-MM-DD".
  // Fixbreite => lexikografischer Vergleich entspricht chronologischer Reihenfolge.
  function isoWeekKey(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var t = new Date(d.valueOf());
    var day = (d.getDay() + 6) % 7;        // Mo=0 .. So=6
    t.setDate(t.getDate() - day + 3);      // Donnerstag der ISO-Woche
    var firstThu = new Date(t.getFullYear(), 0, 4);
    var week = 1 + Math.round(((t - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + "-W" + (week < 10 ? "0" + week : week);
  }
  // Zaehlende Einheiten einer Journey: abgeschlossen, kein Yoga, mit passender journeyId.
  function countingSessions(sessions, journeyId) {
    return (sessions || []).filter(function (s) {
      return s && s.status === "done" && s.type !== "yoga" && s.journeyId === journeyId && s.date;
    });
  }
  // Set-artiges Objekt der erfuellten Wochenschluessel (>= freqTarget Einheiten).
  function fulfilledWeekKeys(sessions, journeyId, freqTarget) {
    var counts = {};
    countingSessions(sessions, journeyId).forEach(function (s) {
      var k = isoWeekKey(s.date); counts[k] = (counts[k] || 0) + 1;
    });
    var out = {};
    Object.keys(counts).forEach(function (k) { if (counts[k] >= freqTarget) out[k] = true; });
    return out;
  }
  // Journey-Wochennummer (1-basiert) der Kalenderwoche, in der dateStr liegt:
  // Anzahl erfuellter Wochen STRIKT VOR dieser Woche + 1. Die laufende Woche
  // behaelt ihre Nummer Mo–So und wird erst rueckwirkend erfuellt.
  function journeyWeekForDate(dateStr, sessions, journeyId, freqTarget) {
    var key = isoWeekKey(dateStr);
    var ful = fulfilledWeekKeys(sessions, journeyId, freqTarget);
    var before = 0;
    Object.keys(ful).forEach(function (k) { if (k < key) before++; });
    return before + 1;
  }
  // Globale Journey-Wochennummer JETZT (heute).
  function currentJourneyWeek(journey, sessions, freqTarget) {
    return journeyWeekForDate(today(), sessions, journey.id, freqTarget);
  }
  // Mapping globale Wochennummer -> { phaseIndex, phaseId, weekInPhase, done }.
  // globalWeek > Summe aller Phasenwochen => done:true (Journey durchlaufen).
  function phasePlacement(phases, globalWeek) {
    phases = phases || [];
    var acc = 0;
    for (var i = 0; i < phases.length; i++) {
      var w = phases[i].weeks || 0;
      if (globalWeek <= acc + w) {
        return { phaseIndex: i, phaseId: phases[i].id, weekInPhase: globalWeek - acc, done: false };
      }
      acc += w;
    }
    var last = phases.length - 1;
    return {
      phaseIndex: last,
      phaseId: last >= 0 ? phases[last].id : null,
      weekInPhase: last >= 0 ? (phases[last].weeks || 0) : 0,
      done: true
    };
  }
  // Komfort: aktuelle Platzierung der Journey (Phase + Woche-in-Phase + globale Woche).
  function journeyPlacement(journey, sessions, freqTarget) {
    var gw = currentJourneyWeek(journey, sessions, freqTarget);
    var p = phasePlacement(journey.phases || [], gw);
    p.globalWeek = gw;
    return p;
  }
  // Nummer der ISO-Woche aus einem Schluessel "YYYY-Www" (z.B. 31). 0 wenn ungueltig.
  function isoWeekNumOf(key) {
    var m = /W(\d+)$/.exec(key || "");
    return m ? parseInt(m[1], 10) : 0;
  }
  // Fortschritt der Kalenderwoche, in der dateStr liegt: gezaehlte Krafteinheiten,
  // Frequenzziel und ob erfuellt. Reine Anzahl abgeschlossener Einheiten (kein Score),
  // Reihenfolge egal. journeyWeek = globale Journey-Wochennummer dieser KW.
  function weekProgress(sessions, journeyId, freqTarget, dateStr) {
    var key = isoWeekKey(dateStr);
    var units = 0;
    countingSessions(sessions, journeyId).forEach(function (s) {
      if (isoWeekKey(s.date) === key) units++;
    });
    var target = Math.max(1, freqTarget || 1);
    return {
      isoKey: key,
      weekNum: isoWeekNumOf(key),
      units: units,
      target: target,
      fulfilled: units >= target,
      journeyWeek: journeyWeekForDate(dateStr, sessions, journeyId, target)
    };
  }
  // Datum -> "YYYY-MM-DD" in lokaler Zeit (fuer die Wochen-Iteration der Leiste).
  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  // Leiste der letzten 'count' Kalenderwochen bis dateStr (nicht vor Journey-Start),
  // chronologisch (aelteste zuerst). Je Woche: { isoKey, weekNum, units, target,
  // fulfilled, journeyWeek, current }. journeyWeek = erfuellte Wochen strikt davor + 1,
  // daher tragen eine verpasste Woche und ihre Wiederholung dieselbe Nummer.
  function weekTrail(journey, sessions, freqTarget, dateStr, count, fwd) {
    var target = Math.max(1, freqTarget || 1);
    var n = Math.max(1, count || 5);
    var fwdN = Math.max(0, fwd || 0);
    var jid = journey ? journey.id : null;
    var startKey = (journey && journey.startDate) ? isoWeekKey(journey.startDate) : null;
    var curKey = isoWeekKey(dateStr);
    var keys = [];
    var d = new Date(dateStr + "T00:00:00");
    var guard = 0;
    while (keys.length < n && guard < 520) {
      guard++;
      var k = isoWeekKey(ymd(d));
      if (startKey && k < startKey) break;        // nicht vor Journey-Start
      if (keys.indexOf(k) < 0) keys.unshift(k);   // aelteste zuerst
      d.setDate(d.getDate() - 7);
    }
    // Vorschau kommender Kalenderwochen (leer, ohne Status) ans Ende anhaengen.
    var df = new Date(dateStr + "T00:00:00");
    for (var fi = 0; fi < fwdN; fi++) {
      df.setDate(df.getDate() + 7);
      var kf = isoWeekKey(ymd(df));
      if (keys.indexOf(kf) < 0) keys.push(kf);
    }
    var counts = {};
    countingSessions(sessions, jid).forEach(function (s) {
      var wk = isoWeekKey(s.date); counts[wk] = (counts[wk] || 0) + 1;
    });
    var fulKeys = Object.keys(fulfilledWeekKeys(sessions, jid, target));
    return keys.map(function (k) {
      var units = counts[k] || 0;
      var before = 0;
      for (var i = 0; i < fulKeys.length; i++) if (fulKeys[i] < k) before++;
      return {
        isoKey: k,
        weekNum: isoWeekNumOf(k),
        units: units,
        target: target,
        fulfilled: units >= target,
        journeyWeek: before + 1,
        current: k === curKey,
        future: k > curKey
      };
    });
  }

  /* =========================================================
     Skills – statische Definition (wie JOURNEY_TEMPLATES Code,
     kein Nutzerzustand). Korrekturen greifen ohne Migration.
     Metrik sitzt auf der Uebung; Phasenaufstieg ist phasenweit.
     metric: offener String (v1 "reps"/"duration").
     target: Skalar (reps/duration) ODER Objekt (spaetere Metriken).
     equipment: immer Array von Equipment-IDs ([] = Koerpergewicht).
     ========================================================= */
  // Skill-Uebung: { name, metric, sets, target, tempo? }
  function skEx(name, metric, sets, target, tempo) {
    return { name: name, metric: metric, sets: sets, target: target, tempo: tempo || null };
  }
  function skillPhase(index, label, equipment, consecutiveSessions, exercises, description) {
    return {
      index: index, label: label, description: description || "",
      equipment: equipment || [], consecutiveSessions: consecutiveSessions,
      exercises: exercises
    };
  }
  function skill(id, name, category, phases, image) {
    return { id: id, name: name, category: category, image: image || null, phases: phases };
  }

  var SKILLS = [
    skill("strict_pullup", "Strict Pull-Up", "gymnastics", [
      skillPhase(0, "Grundspannung", ["pullup-bar"], 2, [
        skEx("Dead Hang", "duration", 3, 30),
        skEx("Scapular Pull-Up", "reps", 3, 5)
      ], "Dead Hang und Skapula-Kontrolle aufbauen."),
      skillPhase(1, "Band stark", ["pullup-bar", "band-heavy"], 2, [
        skEx("Band Pull-Up (stark)", "reps", 3, 6)
      ]),
      skillPhase(2, "Band mittel", ["pullup-bar", "band-medium"], 2, [
        skEx("Band Pull-Up (mittel)", "reps", 3, 6)
      ]),
      skillPhase(3, "Band leicht", ["pullup-bar", "band-light"], 2, [
        skEx("Band Pull-Up (leicht)", "reps", 3, 8)
      ]),
      skillPhase(4, "Negativs", ["pullup-bar"], 2, [
        skEx("Negative Pull-Up", "reps", 3, 5, "5 Sek. ablassen")
      ], "Sauber und langsam ablassen, Spannung halten."),
      skillPhase(5, "Freier Klimmzug", ["pullup-bar"], 2, [
        skEx("Strict Pull-Up", "reps", 3, 8)
      ])
    ], "Strict_pull_up.jpeg"),
    skill("pushup", "Pushup", "gymnastics", [
      skillPhase(0, "Knie-Liegestütze", [], 2, [
        skEx("Knee Push-Up", "reps", 3, 10)
      ]),
      skillPhase(1, "Hände erhöht", [], 2, [
        skEx("Incline Push-Up", "reps", 3, 10)
      ]),
      skillPhase(2, "Volle Liegestütze", [], 2, [
        skEx("Full Push-Up", "reps", 3, 12)
      ]),
      skillPhase(3, "Mehr Volumen", [], 2, [
        skEx("Full Push-Up", "reps", 3, 18)
      ]),
      skillPhase(4, "Hohes Volumen", [], 2, [
        skEx("Full Push-Up", "reps", 3, 26)
      ]),
      skillPhase(5, "Ziel: 35 saubere", [], 2, [
        skEx("Full Push-Up", "reps", 3, 35)
      ])
    ], "Pushup.jpeg")
    // Plank (reiner Zeit-Skill), Pistol Squat, Dip, Handstand, Turkish Get-Up,
    // Lauf/Kondition (eigene Metriken) folgen jeweils einzeln mit Recherche.
  ];

  // Skill-Equipment-Defaults (Auswahl-Tor). Wirkt nur ueber inventory.equipment.
  function defaultEquipment() {
    return [
      { id: "band-heavy",  label: "Band stark",     active: true  },
      { id: "band-medium", label: "Band mittel",    active: true  },
      { id: "band-light",  label: "Band leicht",    active: false },
      { id: "pullup-bar",  label: "Klimmzugstange", active: true  },
      { id: "rings",       label: "Ringe",          active: false },
      { id: "parallettes", label: "Parallettes",    active: false }
    ];
  }

  // Statische Definition nachschlagen (kein DB-Zugriff).
  function skillById(id) { return SKILLS.find(function (s) { return s.id === id; }) || null; }

  // Dynamischen Fortschritt zum Skill holen. Legt bei Bedarf einen neutralen
  // Eintrag an (active:false) und haengt ihn an db().skillProgress, damit der
  // zurueckgegebene Eintrag persistierbar/mutierbar ist. Aktivieren (Skills-Tab)
  // setzt active:true; ein neutraler Eintrag taucht in "Meine Skills" nicht auf.
  function skillProgressFor(id) {
    var db = KS.db();
    db.skillProgress = db.skillProgress || [];
    var p = db.skillProgress.find(function (e) { return e.skillId === id; });
    if (!p) {
      p = { skillId: id, active: false, currentPhase: 0, consecutiveCount: 0, mastered: false, log: [] };
      db.skillProgress.push(p);
    }
    return p;
  }

  /* =========================================================
     Schema-Migration (non-destruktiv, feldweise)
     ========================================================= */
  function migrate(db) {
    db.schemaVersion = KS.SCHEMA;
    db.sessions = db.sessions || [];
    db.journeys = db.journeys || [];
    db.exercises = db.exercises || [];
    db.bodyLog = db.bodyLog || [];
    db.templates = db.templates || [];
    // Vorschaubild-Feld feldweise nachruesten (non-destruktiv): vorhandene image-Werte
    // bleiben unangetastet, fehlende werden bequem aus dem Namen abgeleitet.
    db.templates.forEach(function (t) { if (!t.image) t.image = "Workout " + t.name + ".jpeg"; });
    // Pausen-Timer-Settings nachruesten (non-destruktiv, feldweise)
    db.settings = db.settings || {};
    if (!db.settings.timers) db.settings.timers = {};
    var TMR = db.settings.timers;
    if (TMR.setRestSec == null) TMR.setRestSec = 120;
    if (TMR.exerciseRestSec == null) TMR.exerciseRestSec = 180;
    if (TMR.autoStart == null) TMR.autoStart = true;
    if (TMR.sound == null) TMR.sound = true;
    if (TMR.vibrate == null) TMR.vibrate = true;
    // Journey-/Phasen-Felder nachrüsten (non-destruktiv)
    db.journeys.forEach(function (j) {
      if (!j.status) j.status = "active";
      (j.phases || []).forEach(function (p) { if (!p.repTarget) p.repTarget = repTargetForFocus(p.focus); });
    });
    // genau eine aktive Journey sicherstellen
    if (db.journeys.length) {
      var act = db.journeys.filter(function (j) { return j.active; });
      if (act.length === 0) {
        var cand = db.journeys.find(function (j) { return j.status !== "archived"; }) || db.journeys[0];
        cand.active = true;
      } else if (act.length > 1) {
        act.slice(1).forEach(function (j) { j.active = false; });
      }
    }
    // Einmalige Migration (2026): Pull Over aktivieren und in den Einheiten C und E
    // den Core-Slot durch Pull Over ersetzen. Greift genau einmal; spaetere manuelle
    // Aenderungen werden nicht zurueckgesetzt.
    db.migrations = db.migrations || {};
    if (!db.migrations.pulloverSlots) {
      var po = db.exercises.find(function (e) { return e.id === "pull_over"; });
      if (!po) db.exercises.push(ex("pull_over", "Pull Over", "strength", "lift2", "bar_std", ["back", "chest"], [8, 12], 20, 48));
      else po.active = true;
      db.templates.forEach(function (t) {
        if (t.id !== "t_c" && t.id !== "t_e") return;
        if (Array.isArray(t.items)) {
          var ci = t.items.find(function (it) { return it.role === "core"; });
          if (ci) ci.exerciseId = "pull_over"; else t.items.push({ exerciseId: "pull_over", role: "core" });
        } else { t.core = "pull_over"; }
      });
      db.migrations.pulloverSlots = true;
    }
    // Einmalige Migration: Templates von festen Slots (lift1/lift2/core) auf die
    // geordnete items-Liste umstellen. Laeuft nach pulloverSlots, damit die korrekten
    // Slot-Werte uebernommen werden. role ist ein beschreibender Default, frei aenderbar.
    if (!db.migrations.templateItems) {
      db.templates.forEach(function (t) {
        if (Array.isArray(t.items)) return;
        var items = [];
        if (t.lift1) items.push({ exerciseId: t.lift1, role: "primary" });
        if (t.lift2) items.push({ exerciseId: t.lift2, role: "secondary" });
        if (t.core) items.push({ exerciseId: t.core, role: "core" });
        t.items = items;
        delete t.lift1; delete t.lift2; delete t.core;
      });
      db.migrations.templateItems = true;
    }
    // Einmalige Migration: Uebungseigenschaft slot (lift1/lift2/core, eine Position)
    // durch kind ersetzen (main/accessory/core, eine Kategorie). Position steckt jetzt
    // im Template-Item, nicht mehr an der Uebung.
    if (!db.migrations.exerciseKind) {
      db.exercises.forEach(function (e) {
        if (!e.kind) e.kind = kindOf(e.id, e.profile);
        delete e.slot;
      });
      db.migrations.exerciseKind = true;
    }
    // Skills-System (Schema 0.14, rein additiv): Equipment-Inventar und
    // Fortschritts-Array nachruesten. Equipment-Merge laesst spaeter eingefuehrte
    // Geraetetypen bei Bestandsnutzern auftauchen, ohne deren Auswahl zu ueberschreiben.
    db.inventory = db.inventory || {};
    if (!db.inventory.equipment) {
      db.inventory.equipment = defaultEquipment();
    } else {
      var haveEq = db.inventory.equipment.map(function (e) { return e.id; });
      defaultEquipment().forEach(function (d) { if (haveEq.indexOf(d.id) < 0) db.inventory.equipment.push(d); });
    }
    db.skillProgress = db.skillProgress || [];
    // Einmalig: globale Journey-Wochennummer je Krafteinheit einfrieren (Feld week),
    // damit auch Altdaten nachvollziehbar bleiben. Yoga bleibt bewusst ohne week.
    // Pro Journey einmal die erfuellten Wochen bestimmen (O(n) je Einheit).
    if (!db.migrations.journeyWeek) {
      var freqM = (db.settings && db.settings.weeklyFrequencyTarget) || 3;
      (db.journeys || []).forEach(function (j) {
        var keys = Object.keys(fulfilledWeekKeys(db.sessions, j.id, freqM));
        (db.sessions || []).forEach(function (s) {
          if (s.status !== "done" || s.type === "yoga" || s.journeyId !== j.id || !s.date) return;
          var key = isoWeekKey(s.date), before = 0;
          for (var i = 0; i < keys.length; i++) if (keys[i] < key) before++;
          s.week = before + 1;
        });
      });
      db.migrations.journeyWeek = true;
    }
    // Einmalig: inerte Felder currentPhaseId/currentWeek aus allen Journeys entfernen.
    // Phase und Woche werden trainingsgetrieben berechnet; die Felder werden nirgends
    // mehr gelesen (Reste alter manueller Steuerung bzw. versehentlicher Klicks).
    if (!db.migrations.journeyFieldsStripped) {
      (db.journeys || []).forEach(function (j) { delete j.currentPhaseId; delete j.currentWeek; });
      db.migrations.journeyFieldsStripped = true;
    }
    // Einmalig: die Standard-Journey (j_2026_aufbau) als Instanz ihrer Vorlage
    // "Wiedereinstieg & Aufbau" kennzeichnen und ihre Phasen exakt auf den
    // Vorlagenstand bringen (veralteter Hypertrophie-Wert -> aktueller Stand).
    // Name bleibt erhalten (frei umbenennbar); Phasen-IDs p0..p3 bleiben gleich,
    // daher bleiben Session-Verknuepfungen (phaseId) gueltig.
    if (!db.migrations.journeyTemplateLink) {
      var rt = JOURNEY_TEMPLATES.find(function (t) { return t.id === "reentry_build"; });
      (db.journeys || []).forEach(function (j) {
        if (j.id === "j_2026_aufbau" && !j.templateId && rt) {
          j.templateId = "reentry_build";
          j.phases = rt.phases.map(function (p, i) { return phase("p" + i, p.n, p.f, p.w, p.s0, p.s1, p.dl, p.rt); });
        }
      });
      db.migrations.journeyTemplateLink = true;
    }
  }

  /* Export an den geteilten Namespace. seed/migrate werden beim Init
     gebraucht; die uebrigen von Views/Journey-Logik in app.js. */
  KS.seed = seed;
  KS.migrate = migrate;
  KS.kindLabel = kindLabel;
  KS.phase = phase;
  KS.repTargetForFocus = repTargetForFocus;
  KS.focusLabel = focusLabel;
  KS.templateWeeks = templateWeeks;
  KS.isoWeekKey = isoWeekKey;
  KS.fulfilledWeekKeys = fulfilledWeekKeys;
  KS.journeyWeekForDate = journeyWeekForDate;
  KS.currentJourneyWeek = currentJourneyWeek;
  KS.phasePlacement = phasePlacement;
  KS.journeyPlacement = journeyPlacement;
  KS.weekProgress = weekProgress;
  KS.isoWeekNumOf = isoWeekNumOf;
  KS.weekTrail = weekTrail;
  KS.JOURNEY_TEMPLATES = JOURNEY_TEMPLATES;
  KS.SKILLS = SKILLS;
  KS.defaultEquipment = defaultEquipment;
  KS.skillById = skillById;
  KS.skillProgressFor = skillProgressFor;
})();
