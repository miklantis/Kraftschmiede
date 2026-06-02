/* Fitness-System – App v0.1 (Schema 0.13). Vanilla JS, framework-frei.
   Setzt window.FSE (engine.js) voraus. */
(function () {
  "use strict";
  var E = window.FSE;
  var KS = (window.KS = window.KS || {});
  var SCHEMA = "0.14";
  /* Frueh-Export: seed()/migrate() aus data.js laufen bereits beim Init
     und brauchen SCHEMA + today() (today ist als Funktionsdeklaration gehoistet). */
  KS.SCHEMA = SCHEMA;
  KS.today = today;

  /* =========================================================
     Persistenz: localStorage mit In-Memory-Fallback
     ========================================================= */
  var KEY = "fs_db_v013";
  var Store = {
    persistent: true,
    mem: null,
    test: function () {
      try { localStorage.setItem("__fs_t", "1"); localStorage.removeItem("__fs_t"); return true; }
      catch (e) { return false; }
    },
    load: function () {
      if (!this.test()) { this.persistent = false; return this.mem; }
      try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
      catch (e) { return null; }
    },
    save: function (db) {
      this.mem = db;
      if (!this.persistent) return false;
      try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
      catch (e) { this.persistent = false; return false; }
    },
    wipe: function () { try { localStorage.removeItem(KEY); } catch (e) {} this.mem = null; }
  };

  /* =========================================================
     Seed-Daten, Domaene, Journey-Vorlagen, Migration -> data.js.
     Lokale Delegates auf window.KS, damit Init und Aufrufstellen
     unveraendert bleiben. JOURNEY_TEMPLATES als Alias auf die in
     data.js gehaltene Vorlagenliste.
     ========================================================= */
  function seed() { return KS.seed.apply(null, arguments); }
  function migrate() { return KS.migrate.apply(null, arguments); }
  function kindLabel() { return KS.kindLabel.apply(null, arguments); }
  function phase() { return KS.phase.apply(null, arguments); }
  function repTargetForFocus() { return KS.repTargetForFocus.apply(null, arguments); }
  function focusLabel() { return KS.focusLabel.apply(null, arguments); }
  function templateWeeks() { return KS.templateWeeks.apply(null, arguments); }
  var JOURNEY_TEMPLATES = KS.JOURNEY_TEMPLATES;

  /* =========================================================
     State
     ========================================================= */
  var DB = Store.load() || seed();

  /* Dashboard: angeheftete Graphen. Bewusst SEPARAT gespeichert (eigener Key),
     daher NICHT Teil von DB und nicht im JSON-Export/Import. */
  var DASH_KEY = "fs_dash_v013";
  var DASH = (function () { try { if (!Store.persistent) return []; var r = localStorage.getItem(DASH_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } })();
  function dashSave() { try { if (Store.persistent) localStorage.setItem(DASH_KEY, JSON.stringify(DASH)); } catch (e) {} }
  function dashHas(exId, metric) { return DASH.some(function (d) { return d.exerciseId === exId && d.metric === metric; }); }
  function dashToggle(exId, metric) { var i = DASH.findIndex(function (d) { return d.exerciseId === exId && d.metric === metric; }); if (i >= 0) DASH.splice(i, 1); else DASH.push({ exerciseId: exId, metric: metric }); dashSave(); }
  function dashMove(i, dir) { var j = i + dir; if (j < 0 || j >= DASH.length) return; var t = DASH[i]; DASH[i] = DASH[j]; DASH[j] = t; dashSave(); }
  function dashRemove(i) { if (i >= 0 && i < DASH.length) { DASH.splice(i, 1); dashSave(); } }
  function dashReorder(from, to) { if (from === to || from < 0 || to < 0 || from >= DASH.length || to >= DASH.length) return; var item = DASH.splice(from, 1)[0]; DASH.splice(to, 0, item); dashSave(); }

  migrate(DB);
  var UI = { tab: "training", detail: null, live: null, importPreview: null, journeyPicker: false, calMonth: null, plateShow: {}, menuOpen: false, woView: "calendar", bodyDraft: null };
  // Laufende Session nach Browser-/App-Neustart wiederherstellen. Die Uhr
  // laeuft ueber den gespeicherten startedAt-Zeitstempel korrekt weiter.
  if (DB.live && DB.live.status === "live") { UI.live = DB.live; UI.tab = "training"; }

  function persist() { var okp = Store.save(DB); if (!okp) flashStore(); if (window.KSSync) window.KSSync.schedulePush(); }

  /* =========================================================
     Utils
     ========================================================= */
  function uid(p) { return (p || "id_") + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtW(x) { if (x == null) return "–"; return (Math.round(x * 100) / 100).toString().replace(/\.0+$/, "") + " " + DB.settings.unit; }
  function fmtNum(x) { if (x == null) return "–"; return (Math.round(x * 100) / 100).toString().replace(/\.0+$/, ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function exById(id) { return DB.exercises.find(function (e) { return e.id === id; }); }
  function barById(id) { return DB.inventory.bars.find(function (b) { return b.id === id; }) || DB.inventory.bars.find(function (b) { return b.default; }) || DB.inventory.bars[0]; }
  // Erste Stange der Liste – wird im Workout pro Uebung vorausgewaehlt.
  function firstBar() { return DB.inventory.bars[0]; }
  function tplById(id) { return DB.templates.find(function (t) { return t.id === id; }); }
  // Lese-Adapter: liefert fuer ein Template immer eine geordnete Item-Liste [{ exerciseId, role }].
  // Liest die neue items-Form, faellt non-destruktiv auf die alten Felder lift1/lift2/core zurueck.
  // role ist optional und rein beschreibend – Logik haengt weiter an Reihenfolge bzw. exercise.profile.
  function tplItems(t) {
    if (!t) return [];
    if (Array.isArray(t.items)) {
      return t.items
        .map(function (it) { return (typeof it === "string") ? { exerciseId: it } : { exerciseId: it.exerciseId, role: it.role }; })
        .filter(function (it) { return it.exerciseId; });
    }
    var out = [];
    if (t.lift1) out.push({ exerciseId: t.lift1, role: "primary" });
    if (t.lift2) out.push({ exerciseId: t.lift2, role: "secondary" });
    if (t.core) out.push({ exerciseId: t.core, role: "core" });
    return out;
  }
  function activeJourney() {
    var js = DB.journeys || [];
    return js.find(function (j) { return j.active; }) || js.find(function (j) { return j.status !== "archived"; }) || js[0] || null;
  }
  function currentPhase() { var j = activeJourney(); if (!j) return null; return (j.phases || []).find(function (p) { return p.id === j.currentPhaseId; }) || (j.phases || [])[0]; }
  function dateMs(s) { return new Date(s + "T12:00:00").getTime(); }
  function isoWeek(dateStr) {
    var d = new Date(dateStr + "T00:00:00"); var t = new Date(d.valueOf());
    var day = (d.getDay() + 6) % 7; t.setDate(t.getDate() - day + 3);
    var first = new Date(t.getFullYear(), 0, 4);
    var wk = 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + "-W" + pad(wk);
  }

  /* =========================================================
     Engine-Glue
     ========================================================= */
  function doneSessions() { return DB.sessions.filter(function (s) { return s.status === "done"; }).sort(function (a, b) { return dateMs(a.date) - dateMs(b.date); }); }
  function lastEntryForExercise(exId) {
    var ss = doneSessions();
    for (var i = ss.length - 1; i >= 0; i--) {
      var en = (ss[i].entries || []).find(function (e) { return e.exerciseId === exId; });
      if (en) return { entry: en, session: ss[i] };
    }
    return null;
  }
  function lastByExercise() {
    var map = {}; doneSessions().forEach(function (s) {
      (s.entries || []).forEach(function (en) { map[en.exerciseId] = dateMs(s.date); });
    }); return map;
  }
  function weekCounts() {
    var wk = isoWeek(today()), map = {};
    doneSessions().forEach(function (s) {
      if (isoWeek(s.date) !== wk) return;
      (s.entries || []).forEach(function (en) { map[en.exerciseId] = (map[en.exerciseId] || 0) + 1; });
    }); return map;
  }
  function suggestForExercise(exo, ph) {
    var focus = ph ? ph.focus : null;
    var le = lastEntryForExercise(exo.id);
    var exUse = exo;
    var rt = ph ? (ph.repTarget || repTargetForFocus(ph.focus)) : null;
    if (rt && exo.profile !== "core") { exUse = clone(exo); exUse.repRange = rt.slice(); }
    return E.suggestWeight(exUse, le ? le.entry : null, {
      bar: barById(exo.barId), plates: DB.inventory.plates,
      reentry: focus === "reentry"
    });
  }
  function plannedSetCount() {
    var ph = currentPhase(); var j = activeJourney();
    if (!ph) return 3;
    var green = recoveryGreenNow();
    return E.volumeForWeek(ph, (j.currentWeek || 1) - 1, green);
  }
  function blankBody() { return { legs: 0, upper_body: 0, overall: 0, pain: { flag: false, note: "" }, readiness: 3, notes: "" }; }
  function sortedBodyLog() { return (DB.bodyLog || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  function todayBody() { return (DB.bodyLog || []).find(function (e) { return e.date === today(); }) || null; }
  function latestBody() {
    var log = sortedBodyLog();
    if (log.length) return log[log.length - 1];
    return blankBody();
  }
  function snapshotBody() { var b = todayBody() || latestBody(); return { legs: b.legs || 0, upper_body: b.upper_body || 0, overall: b.overall || 0, pain: { flag: !!(b.pain && b.pain.flag) }, readiness: b.readiness || 3, notes: b.notes || "" }; }
  function entryBar(en) { return barById(en.barId || (exById(en.exerciseId) || {}).barId); }
  // Rest-Empfehlung aus dem aktuellen Körperzustand (heute, sonst letzter Eintrag)
  function restAdvice() {
    var t = todayBody();
    var b = t || latestBody();
    var reasons = [];
    if (!t) return { level: "unknown", reasons: ["Heute noch kein Körperzustand erfasst"] };
    var pain = !!(b.pain && b.pain.flag);
    var legs = b.legs || 0, upper = b.upper_body || 0, overall = b.overall || 0, rdy = b.readiness || 3;
    if (pain) reasons.push("Schmerz gemeldet");
    if (overall >= 3) reasons.push("Gesamt-Muskelkater hoch");
    if (legs >= 3) reasons.push("Beine stark");
    if (upper >= 3) reasons.push("Oberkörper stark");
    if (rdy <= 1) reasons.push("Readiness sehr niedrig");
    if (reasons.length) return { level: "rest", reasons: reasons };
    var cautions = [];
    if (rdy === 2) cautions.push("Readiness niedrig");
    if (overall === 2) cautions.push("Gesamt-Muskelkater mittel");
    if ((legs >= 2 ? 1 : 0) + (upper >= 2 ? 1 : 0) >= 2) cautions.push("mehrere Regionen mittel");
    if (cautions.length) return { level: "caution", reasons: cautions };
    return { level: "ok", reasons: [] };
  }
  function recoveryGreenNow() {
    var b = latestBody();
    return (b.legs || 0) < 2 && (b.upper_body || 0) < 2 && (b.overall || 0) < 2 && (b.readiness || 3) >= 3;
  }
  function rankWorkouts() {
    var b = latestBody(); var exMap = {}; DB.exercises.forEach(function (e) { exMap[e.id] = e; });
    var ctx = { now: Date.now(), lastByExercise: lastByExercise(), soreness: { legs: b.legs, upper_body: b.upper_body, overall: b.overall }, weekCounts: weekCounts(), phase: currentPhase(), freqTarget: DB.settings.weeklyFrequencyTarget };
    return DB.templates.map(function (t) {
      var s = E.suitability(t, ctx, { exMap: exMap });
      return { tpl: t, score: s.score, excluded: s.excluded, reasons: s.reasons };
    }).sort(function (a, b) { if (a.excluded !== b.excluded) return a.excluded ? 1 : -1; return b.score - a.score; });
  }

  /* =========================================================
     Charts (SVG) – Implementierung ausgelagert nach charts.js.
     Lokale Delegates auf window.KS, damit alle Aufrufstellen
     unveraendert bleiben.
     ========================================================= */
  function lineChart() { return KS.lineChart.apply(null, arguments); }
  function barChart() { return KS.barChart.apply(null, arguments); }
  function emptyChart() { return KS.emptyChart.apply(null, arguments); }
  function plateLoaderSVG() { return KS.plateLoaderSVG.apply(null, arguments); }
  function timerIcon() { return KS.timerIcon.apply(null, arguments); }
  function xIcon() { return KS.xIcon.apply(null, arguments); }
  function plateIcon() { return KS.plateIcon.apply(null, arguments); }
  function plateHint() { return KS.plateHint.apply(null, arguments); }
  function plateColor() { return KS.plateColor.apply(null, arguments); }
  function plateChips() { return KS.plateChips.apply(null, arguments); }
  function drawJourneyChart() { return KS.drawJourneyChart.apply(null, arguments); }

  /* =========================================================
     Rendering – Shell & Nav
     ========================================================= */
  var TABS = [
    { id: "training", label: "Training" },
    { id: "body", label: "Körper" },
    { id: "workouts", label: "Verlauf" },
    { id: "journey", label: "Journey" },
    { id: "exercises", label: "Übungen" },
    { id: "inventory", label: "Inventar" },
    { id: "settings", label: "Einstellungen" }
  ];
  function authBtn() {
    var s = (window.KSSync && window.KSSync.status) ? window.KSSync.status() : { loggedIn: false, email: "" };
    var icon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"></path></svg>';
    return '<button class="auth-btn' + (s.loggedIn ? ' in' : '') + '" data-action="auth-open" title="' + (s.loggedIn ? esc("Angemeldet: " + (s.email || "")) : "Konto / Anmelden") + '" aria-label="Konto">' + icon + (s.loggedIn ? '<span class="auth-dot"></span>' : '') + '</button>';
  }
  function refreshAuthIcon() { var b = document.querySelector(".auth-btn"); if (b) b.outerHTML = authBtn(); }

  function ensureAuthModal() {
    if (document.getElementById("ks-auth-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-auth-modal";
    ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Konto">'
      + '<div class="ks-modal-head"><span class="ks-modal-title">Konto &amp; Cloud-Sync</span>'
      + '<button class="ks-modal-x" data-action="auth-close" aria-label="Schließen">\u2715</button></div>'
      + '<div id="ks-sync-panel"></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeAuthModal(); });
    document.body.appendChild(ov);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAuthModal(); });
  }
  function openAuthModal() { ensureAuthModal(); if (window.KSSync) window.KSSync.mountPanel(); document.getElementById("ks-auth-modal").classList.add("open"); }
  function closeAuthModal() { var m = document.getElementById("ks-auth-modal"); if (m) m.classList.remove("open"); }

  function render() {
    var root = document.getElementById("app");
    var phase = currentPhase(), j = activeJourney();
    var head = '<header class="topbar">'
      + '<div class="brand"><span class="logo">▦</span><span>KRAFTSCHMIEDE</span><span class="ver">Schema ' + SCHEMA + '</span></div>'
      + '<div class="topbar-right"><div class="phasechip">' + (j ? esc(j.name) : "—") + (phase ? ' · <strong>' + esc(phase.name) + '</strong> · W' + (j.currentWeek || 1) + '/' + phase.weeks : '') + '</div>' + authBtn() + '</div>'
      + '</header>';
    var curTab = TABS.find(function (t) { return t.id === UI.tab; }) || TABS[0];
    var nav = '<nav class="tabs' + (UI.menuOpen ? ' menu-open' : '') + '">'
      + '<button class="nav-toggle" data-action="menu-toggle" aria-expanded="' + (UI.menuOpen ? 'true' : 'false') + '"><span class="nav-burger">' + (UI.menuOpen ? '\u2715' : '\u2630') + '</span><span class="nav-current">' + esc(curTab.label) + '</span></button>'
      + '<div class="tab-list">' + TABS.map(function (t) {
        return '<button class="tab' + (UI.tab === t.id ? ' active' : '') + '" data-action="tab" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join("") + '</div></nav>';
    var banner = Store.persistent ? '' : '<div class="banner">Kein dauerhafter Speicher in dieser Umgebung. Daten gehen beim Schließen verloren – nutze <strong>Export</strong> in den Einstellungen. Lokal gespeicherte Datei am Rechner speichert normal.</div>';
    var body = '';
    switch (UI.tab) {
      case "training": body = viewTraining(); break;
      case "body": body = viewBody(); break;
      case "workouts": body = viewWorkouts(); break;
      case "journey": body = UI.journeyPicker ? viewJourneyPicker() : viewJourneyManager(); break;
      case "exercises": body = UI.detail ? viewExerciseDetail(UI.detail) : viewExercises(); break;
      case "inventory": body = viewInventory(); break;
      case "settings": body = viewSettings(); break;
    }
    root.innerHTML = head + nav + banner + '<main class="content">' + body + '</main>';
    if (window.KSSync) window.KSSync.mountPanel();
    if (UI.tab === "training" && UI.live) { bindLiveInputs(); syncActiveSet(); }
    if (UI.tab === "journey" && !UI.journeyPicker) drawJourneyChart();
    manageClock();
    syncRestBar();
  }

  /* =========================================================
     View: Training (Live)
     ========================================================= */
  // Pfad zum Vorschaubild eines Workouts (images/Workout X.jpeg). Leerzeichen wird URL-codiert.
  function woImage(name) { return "images/" + encodeURIComponent("Workout " + name) + ".jpeg"; }
  function viewTraining() {
    if (UI.live) return liveSession();
    var ranked = rankWorkouts();
    var cards = ranked.map(function (r, i) {
      var t = r.tpl;
      var names = tplItems(t).map(function (it) { var e = exById(it.exerciseId); return e ? esc(e.name) : it.exerciseId; });
      return '<div class="wo-card' + (i === 0 ? ' rec' : '') + (r.excluded ? ' excl' : '') + '">'
        + '<div class="wo-thumb">'
        + '<img class="wo-img" src="' + woImage(t.name) + '" alt="Workout ' + esc(t.name) + '" loading="lazy" onerror="this.remove()">'
        + '<span class="wo-grad"></span>'
        + '<span class="wo-name">Workout ' + esc(t.name) + '</span>'
        + '<span class="score-badge" title="Suitability-Score">' + fmtNum(r.score) + '</span>'
        + '</div>'
        + '<div class="wo-body">'
        + '<div class="wo-lifts">' + names[0] + ' › ' + names[1] + ' › ' + names[2] + '</div>'
        + (r.excluded ? '<div class="wo-excl">ausgeschlossen (Muskelkater)</div>' : '')
        + '<div class="wo-reasons">' + r.reasons.slice(0, 3).map(esc).join(" · ") + '</div>'
        + '<button class="btn ' + (i === 0 ? 'primary' : 'ghost') + '" data-action="start" data-tpl="' + t.id + '"' + (r.excluded ? ' disabled' : '') + '>' + (i === 0 ? 'Empfehlung starten' : 'starten') + '</button>'
        + '</div>'
        + '</div>';
    }).join("");
    return '<div class="section-title">Heute trainieren</div>'
      + '<div class="wo-grid">' + cards + yogaCard() + '</div>';
  }
  // Yoga als Karte im Training-Stil, am Ende der Workout-Liste. Blau (accent-2)
  // statt orange. Ein Klick traegt sofort eine Einheit fuer heute ein (80 min).
  function yogaCard() {
    return '<div class="wo-card yoga-wo">'
      + '<div class="wo-thumb">'
      + '<img class="wo-img" src="images/Yoga.jpeg" alt="Yoga" loading="lazy" onerror="this.remove()">'
      + '<span class="wo-grad"></span>'
      + '<span class="wo-name">Yoga</span>'
      + '<span class="score-badge" title="Standarddauer">80 min</span>'
      + '</div>'
      + '<div class="wo-body">'
      + '<div class="wo-lifts">Erholungs- / Mobility-Tag</div>'
      + '<div class="wo-reasons">Getrennt vom Krafttraining · trägt für heute ein</div>'
      + '<button class="btn ghost yoga-btn" data-action="open-yoga">Eintragen</button>'
      + '</div>'
      + '</div>';
  }
  // Yoga-Einheit eintragen. Ohne Argumente: heute, 80 min, ohne Notiz.
  function addYoga(dateStr, min) {
    var d = dateStr || today();
    var m = (min != null && !isNaN(min)) ? min : 80;
    DB.sessions.push({ id: "y_" + d.replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000), date: d, type: "yoga", minutes: m, notes: "", status: "done", entries: [] });
    persist(); render(); toast("Yoga-Einheit eingetragen (" + d + ").");
  }
  // Popup zum Eintragen einer Yoga-Einheit (Datum + Dauer). Wird ueber die
  // Yoga-Karte im Training-Tab geoeffnet.
  function ensureYogaModal() {
    if (document.getElementById("ks-yoga-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-yoga-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Yoga eintragen">'
      + '<div class="ks-modal-head"><span class="ks-modal-title">Yoga / Mobility eintragen</span>'
      + '<button class="ks-modal-x" data-action="yoga-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="yoga-modal-form">'
      + '<label class="yf-date">Datum <input type="date" id="ks-yoga-date"></label>'
      + '<label class="yf-dur">Dauer <input type="number" class="num mini" id="ks-yoga-min" value="80"> min</label>'
      + '</div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="yoga-save">Eintragen</button>'
      + '<button class="btn ghost" data-action="yoga-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeYogaModal(); });
    document.body.appendChild(ov);
  }
  function openYogaModal() {
    ensureYogaModal();
    var dEl = document.getElementById("ks-yoga-date"); if (dEl) dEl.value = today();
    var mEl = document.getElementById("ks-yoga-min"); if (mEl) mEl.value = 80;
    document.getElementById("ks-yoga-modal").classList.add("open");
  }
  function closeYogaModal() { var m = document.getElementById("ks-yoga-modal"); if (m) m.classList.remove("open"); }
  function saveYoga() {
    var d = (document.getElementById("ks-yoga-date") || {}).value || today();
    var m = parseInt((document.getElementById("ks-yoga-min") || {}).value, 10);
    closeYogaModal();
    addYoga(d, isNaN(m) ? 80 : m);
  }
  function restBanner() {
    var a = restAdvice();
    if (a.level === "unknown") {
      return '<div class="rest-card unknown"><div class="rc-main"><strong>Körperzustand heute noch nicht erfasst</strong><span>Für eine passende Empfehlung kurz im Körper-Tab eintragen.</span></div><button class="btn" data-action="tab" data-tab="body">Körperzustand erfassen</button></div>';
    }
    if (a.level === "rest") {
      return '<div class="rest-card rest"><div class="rc-main"><strong>Rest-Tag empfohlen</strong><span>' + esc(a.reasons.join(" · ")) + '. Heute lieber Erholung oder lockere Mobility. Du kannst trotzdem trainieren – dann konservativ.</span></div></div>';
    }
    if (a.level === "caution") {
      return '<div class="rest-card caution"><div class="rc-main"><strong>Vorsicht – reduziert trainieren</strong><span>' + esc(a.reasons.join(" · ")) + '. Volumen/Intensität ggf. zurücknehmen.</span></div></div>';
    }
    return '<div class="rest-card ok"><div class="rc-main"><strong>Bereit fürs Training</strong><span>Körperzustand grün.</span></div></div>';
  }

  /* Trainings-Uhr: zaehlt aus startedAt hoch. Anzeige wird immer aus
     (Date.now() - startedAt) berechnet, daher robust gegen Tab-Wechsel und
     Hintergrund-Drosselung. Das laufende Workout liegt in UI.live. */
  var clockTimer = null;
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60;
    return (h > 0 ? h + ":" + pad(m) : "" + m) + ":" + pad(ss);
  }
  function updateClock() {
    var el = document.getElementById("live-clock");
    if (!el || !UI.live || !UI.live.startedAt) { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } return; }
    el.textContent = fmtDur((Date.now() - UI.live.startedAt) / 1000);
  }
  function manageClock() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    if (UI.tab === "training" && UI.live && UI.live.startedAt) { updateClock(); clockTimer = setInterval(updateClock, 1000); }
  }

  /* ---------------------------------------------------------
     Schritt 2: Satz-Pause-Timer, Signal (Ton + Vibration),
     Aktiv-Markierung des naechsten Satzes. Der Pausen-Balken
     (#ks-rest-bar) lebt im body und ueberlebt App-Re-Renders.
     Countdown ueber absoluten Zielzeitstempel -> robust gegen
     Hintergrund/Tab-Wechsel. Edit (-15/+15) gilt nur fuer den
     laufenden Durchgang und aendert die Defaults nicht. */
  var audioCtx = null, restTimer = null;
  function ensureAudio() {
    try {
      if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
    } catch (e) {}
  }
  function playBeep() {
    var T = DB.settings.timers || {}; if (!T.sound) return;
    try {
      ensureAudio(); if (!audioCtx) return;
      var t0 = audioCtx.currentTime;
      [0, 0.2].forEach(function (off) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(880, t0 + off);
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.16);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t0 + off); o.stop(t0 + off + 0.18);
      });
    } catch (e) {}
  }
  function buzz() {
    var T = DB.settings.timers || {}; if (!T.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
  }
  // Kurzer, moderner UI-Klick beim Umschalten einer Erledigt-Checkbox.
  // "An" klingt heller/aufsteigend, "Aus" tiefer/abfallend. Plus kurze
  // Vibration (Android; iOS Safari unterstuetzt navigator.vibrate nicht).
  // Folgt den Ton-/Vibration-Schaltern in den Einstellungen.
  function clickTick(on) {
    var T = DB.settings.timers || {};
    if (T.sound) {
      try {
        ensureAudio();
        if (audioCtx) {
          var t0 = audioCtx.currentTime;
          var o = audioCtx.createOscillator(), g = audioCtx.createGain();
          var f = on ? 540 : 400;
          o.type = "triangle";
          o.frequency.setValueAtTime(f, t0);
          o.frequency.exponentialRampToValueAtTime(on ? f * 1.7 : f * 0.6, t0 + 0.05);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t0); o.stop(t0 + 0.1);
        }
      } catch (e) {}
    }
    if (T.vibrate) { try { if (navigator.vibrate) navigator.vibrate(on ? 18 : 11); } catch (e) {} }
  }
  function ensureRestBar() {
    if (document.getElementById("ks-rest-bar")) return;
    var bar = document.createElement("div");
    bar.id = "ks-rest-bar"; bar.className = "ks-rest-bar";
    bar.innerHTML = '<span class="rb-side" aria-hidden="true"></span>'
      + '<div class="rb-center">'
      + '<button class="btn tiny ghost rb-step" data-action="rest-minus">\u221215</button>'
      + '<span class="rb-time">0:00</span>'
      + '<button class="btn tiny ghost rb-step" data-action="rest-plus">+15</button>'
      + '</div>'
      + '<span class="rb-side rb-side-r">'
      + '<button class="icon-btn rb-skip" data-action="rest-skip" title="überspringen" aria-label="Pause überspringen">' + xIcon() + '</button>'
      + '</span>';
    document.body.appendChild(bar);
  }
  function startRestTick() { if (restTimer) return; restTimer = setInterval(restTick, 500); }
  function stopRestTick() { if (restTimer) { clearInterval(restTimer); restTimer = null; } }
  function restTick() {
    var r = UI.live && UI.live.rest; var bar = document.getElementById("ks-rest-bar");
    if (!r || !bar) { stopRestTick(); return; }
    var remain = Math.round((r.endsAt - Date.now()) / 1000);
    var timeEl = bar.querySelector(".rb-time");
    if (remain <= 0) {
      if (timeEl) timeEl.textContent = "0:00";
      bar.classList.add("done");
      if (!r.fired) { r.fired = true; if (remain > -3) { playBeep(); buzz(); } }
      stopRestTick();
    } else {
      if (timeEl) timeEl.textContent = fmtDur(remain);
      bar.classList.remove("done");
    }
  }
  function syncRestBar() {
    ensureRestBar();
    var bar = document.getElementById("ks-rest-bar"); if (!bar) return;
    var active = !!(UI.tab === "training" && UI.live && UI.live.rest);
    if (!active) { bar.classList.remove("show", "done"); stopRestTick(); return; }
    bar.classList.add("show"); restTick(); startRestTick();
  }
  function startRest(type, sec, ei, si) {
    if (!UI.live) return;
    sec = Math.max(0, parseInt(sec, 10) || 0); if (!sec) return;
    UI.live.rest = { type: type, baseSec: sec, endsAt: Date.now() + sec * 1000, ei: ei, si: si, fired: false };
    syncRestBar();
  }
  function adjustRest(delta) {
    var r = UI.live && UI.live.rest; if (!r) return;
    r.endsAt = Math.max(Date.now(), r.endsAt) + delta * 1000;
    if (r.endsAt < Date.now()) r.endsAt = Date.now();
    if (r.endsAt - Date.now() > 0) r.fired = false;
    ensureAudio();
    var bar = document.getElementById("ks-rest-bar"); if (bar) bar.classList.remove("done");
    restTick(); startRestTick();
  }
  function skipRest() {
    if (UI.live) UI.live.rest = null;
    stopRestTick();
    var bar = document.getElementById("ks-rest-bar"); if (bar) bar.classList.remove("show", "done");
  }
  function toggleTimers() {
    var T = DB.settings.timers = DB.settings.timers || {};
    T.autoStart = !T.autoStart;
    persist();
    if (!T.autoStart) skipRest();
    var btn = document.querySelector(".timer-toggle");
    if (btn) { btn.classList.toggle("on", !!T.autoStart); btn.setAttribute("aria-pressed", T.autoStart ? "true" : "false"); }
  }
  function syncActiveSet() {
    var root = document.getElementById("app"); if (!root) return;
    root.querySelectorAll(".set-row.work.active-next").forEach(function (r) { r.classList.remove("active-next"); });
    var a = UI.live && UI.live.activeSet; if (!a) return;
    var en = UI.live.entries[a.ei]; var st = en && en.sets[a.si];
    if (!st || st.done) return;
    var row = root.querySelector('.set-row.work[data-ei="' + a.ei + '"][data-si="' + a.si + '"]');
    if (row) row.classList.add("active-next");
  }
  function firstOpenSet(en) { for (var i = 0; i < en.sets.length; i++) { if (!en.sets[i].done) return i; } return -1; }
  function nextOpenExercise(fromEi) {
    for (var i = fromEi + 1; i < UI.live.entries.length; i++) { if (firstOpenSet(UI.live.entries[i]) >= 0) return i; }
    return -1;
  }
  function onSetCompleted(ei, si) {
    ensureAudio();
    var en = UI.live.entries[ei]; var T = DB.settings.timers || {};
    var openSi = firstOpenSet(en);
    if (openSi >= 0) {
      // Uebung noch nicht fertig -> Satz-Pause auf den naechsten offenen Satz
      UI.live.activeSet = { ei: ei, si: openSi };
      syncActiveSet();
      if (T.autoStart) startRest("set", T.setRestSec, ei, openSi);
      return;
    }
    // letzter Satz der Uebung -> naechste Uebung mit offenen Saetzen
    var nextEi = nextOpenExercise(ei);
    if (nextEi >= 0) {
      var firstSi = firstOpenSet(UI.live.entries[nextEi]); if (firstSi < 0) firstSi = 0;
      UI.live.activeSet = { ei: nextEi, si: firstSi };
      syncActiveSet();
      if (T.autoStart) startRest("exercise", T.exerciseRestSec, nextEi, firstSi);
    } else {
      // letzter Satz der letzten Uebung -> kein Timer, Markierung weg, Balken schliessen
      UI.live.activeSet = null;
      syncActiveSet();
      skipRest();
    }
  }

  function buildLive(templateId) {
    var t = tplById(templateId); var phase = currentPhase(); var j = activeJourney();
    var entries = tplItems(t).map(function (it, idx) {
      var id = it.exerciseId;
      var exo = exById(id);
      var sug = suggestForExercise(exo, phase);
      // Core-Uebungen fix 3 Saetze; Kraftuebungen folgen der Phasen-Satzrampe.
      var setN = exo.profile === "core" ? 3 : plannedSetCount();
      var startBarId = (firstBar() || {}).id || exo.barId;
      var warm = [];
      if (exo.category === "barbell") {
        warm = E.generateWarmup(sug.weight, barById(startBarId).weight, DB.inventory.plates, { isLift1: idx === 0, isDeadlift: /deadlift/i.test(exo.id) });
      }
      var planned = []; for (var k = 0; k < setN; k++) planned.push({ reps: sug.targetReps, weight: sug.weight, targetScore: exo.targetScore });
      var sets = planned.map(function (p) {
        return { reps: p.reps, weight: p.weight, score: exo.targetScore, failed: false, done: false, targetReps: p.reps, targetWeight: p.weight, adjusted: false, adjustNote: "" };
      });
      return { exerciseId: id, barId: startBarId, warmupSets: warm, plannedSets: planned, sets: sets, suggestion: sug, tested1RM: null };
    });
    var b = latestBody();
    return {
      id: "s_" + today().replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000),
      date: today(), journeyId: j ? j.id : null, phaseId: phase ? phase.id : null, templateId: templateId,
      status: "live", startedAt: Date.now(), activeSet: { ei: 0, si: 0 }, generalWarmup: { done: false, minutes: 7, mode: "bike" },
      entries: entries, body: { legs: b.legs || 0, upper_body: b.upper_body || 0, overall: b.overall || 0, pain: {}, readiness: b.readiness || 3, notes: "" }
    };
  }

  function liveSession() {
    var s = UI.live; var t = tplById(s.templateId);
    if (!s.startedAt) s.startedAt = Date.now();
    var gw = s.generalWarmup;
    var timersOn = !!((DB.settings.timers || {}).autoStart);
    var html = '<div class="live-head">'
      + '<div class="live-head-l"><div class="section-title">Training · Workout ' + esc(t.name) + '</div></div>'
      + '<div class="live-head-r"><span class="live-clock" id="live-clock" title="Trainingsdauer">' + fmtDur((Date.now() - s.startedAt) / 1000) + '</span>'
      + '<button class="icon-btn timer-toggle' + (timersOn ? ' on' : '') + '" data-action="toggle-timers" aria-pressed="' + (timersOn ? 'true' : 'false') + '" title="Pausen-Timer ein/aus" aria-label="Pausen-Timer ein- oder ausschalten">' + timerIcon() + '</button>'
      + '<button class="btn end-btn small" data-action="finish-workout">Beenden</button></div></div>';

    // Allgemeines Aufwärmen
    html += '<div class="card exercise-live gw-card">'
      + '<div class="ex-live-head"><div class="ehl"><span class="ex-name">Aufwärmen</span><span class="slot-tag warm">WARM</span></div></div>'
      + '<div class="sets-block">'
      + '<div class="set-row warm gw-row' + (gw.done ? ' done' : '') + '">'
      + '<span class="set-i">AF</span>'
      + '<span class="gw-mid"><input type="number" class="num mini" data-live="gw.minutes" value="' + gw.minutes + '"> min ·'
      + ' <select data-live="gw.mode"><option value="bike"' + (gw.mode === "bike" ? " selected" : "") + '>Rad</option><option value="row"' + (gw.mode === "row" ? " selected" : "") + '>Rudern</option><option value="walk"' + (gw.mode === "walk" ? " selected" : "") + '>Gehen</option><option value="other"' + (gw.mode === "other" ? " selected" : "") + '>Sonstiges</option></select></span>'
      + '<label class="field f-done done-chk" title="Aufwärmen erledigt"><input type="checkbox" data-live="gw.done"' + (gw.done ? ' checked' : '') + '></label>'
      + '</div>'
      + '</div></div>';

    s.entries.forEach(function (en, ei) {
      var exo = exById(en.exerciseId); var bar = entryBar(en);
      var sug = en.suggestion || {};
      var showPlate = !!(UI.plateShow && UI.plateShow[ei]);
      html += '<div class="card exercise-live" data-ei="' + ei + '">';
      var barOpts = exo.category === "barbell" ? DB.inventory.bars.map(function (bb) { return '<option value="' + bb.id + '"' + (bb.id === (en.barId || (firstBar() || {}).id) ? " selected" : "") + '>' + esc(bb.name) + ' ' + fmtW(bb.weight) + '</option>'; }).join("") : "";
      html += '<div class="ex-live-head"><div class="ehl"><span class="ex-name">' + esc(exo.name) + '</span>' + (exo.rm ? '<span class="slot-tag">1RM ' + fmtW(exo.rm) + '</span>' : '') + '</div>'
        + (exo.category === "barbell" ? '<div class="ehr"><label class="barpick">Stange <select data-barpick data-ei="' + ei + '">' + barOpts + '</select></label><button class="icon-btn plate-toggle' + (showPlate ? ' on' : '') + '" data-action="toggle-plate" data-ei="' + ei + '" aria-pressed="' + (showPlate ? 'true' : 'false') + '" title="' + (showPlate ? 'Scheiben ausblenden' : 'Scheiben einblenden') + '" aria-label="' + (showPlate ? 'Scheiben ausblenden' : 'Scheiben einblenden') + '">' + plateIcon("pt-ic") + '</button></div>' : '') + '</div>';

      // Sätze: Aufwärmen (A1..) und Arbeit (S1..) in einer Liste
      html += '<div class="sets-block">';
      html += '<div class="set-row head"><span class="set-i">Satz</span><span>Wdh</span><span>kg</span><span>RIR</span><span class="h-done">\u2713</span></div>';
      en.warmupSets.forEach(function (ws, wi) {
        html += '<div class="set-row warm' + (ws.done ? ' done' : '') + '">'
          + '<span class="set-i">A' + (wi + 1) + '</span>'
          + '<span class="ro">' + ws.reps + '</span>'
          + '<span class="ro">' + fmtNum(ws.weight) + '</span>'
          + '<span class="rir-empty"></span>'
          + '<label class="field f-done done-chk" title="Aufwärmsatz erledigt"><input type="checkbox" data-set="w" data-ei="' + ei + '" data-si="' + wi + '"' + (ws.done ? ' checked' : '') + '></label>'
          + '</div>'
          + (showPlate && bar ? '<div class="set-sub">' + plateHint(ws.weight, bar) + '</div>' : '');
      });
      en.sets.forEach(function (st, si) {
        html += workSetRow(ei, si, st, bar, showPlate && exo.category === "barbell");
      });
      html += '<div class="set-actions"><button class="btn tiny ghost" data-action="add-set" data-ei="' + ei + '">+ Satz</button>'
        + (en.sets.length > 1 ? '<button class="btn tiny ghost" data-action="del-set" data-ei="' + ei + '">– Satz</button>' : '') + '</div>';
      html += '</div></div>';
    });

    return html;
  }
  function bodyContextText() {
    var t = todayBody();
    if (!t) return '<span class="bc-none">noch nicht erfasst</span>';
    var adv = restAdvice();
    var lvl = adv.level === "rest" ? '<span class="bc-rest">Rest empfohlen</span>' : (adv.level === "caution" ? '<span class="bc-caut">Vorsicht</span>' : '<span class="bc-ok">grün</span>');
    return 'Beine ' + (t.legs || 0) + ' · OK ' + (t.upper_body || 0) + ' · Gesamt ' + (t.overall || 0) + ' · Readiness ' + (t.readiness || 3) + (t.pain && t.pain.flag ? ' · Schmerz' : '') + ' — ' + lvl;
  }

  function workSetRow(ei, si, st, bar, showChips) {
    var isActive = !!(UI.live && UI.live.activeSet && UI.live.activeSet.ei === ei && UI.live.activeSet.si === si && !st.done);
    var rirCls = "rir-sel" + (st.score === 5 ? " fail" : "") + (st.done ? " set" : "");
    var rirOpts = [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<option value="' + v + '"' + (st.score === v ? " selected" : "") + '>' + i.rir + '</option>'; }).join("");
    var sub = (showChips && bar) ? '<div class="set-sub" data-sub-ei="' + ei + '" data-sub-si="' + si + '">' + plateHint(st.weight, bar) + '</div>' : "";
    return '<div class="set-row work' + (st.done ? ' done' : '') + (isActive ? ' active-next' : '') + '" data-ei="' + ei + '" data-si="' + si + '">'
      + '<span class="set-i">S' + (si + 1) + '</span>'
      + '<div class="field f-reps"><input type="number" inputmode="numeric" class="num" data-set="reps" data-ei="' + ei + '" data-si="' + si + '" value="' + st.reps + '"></div>'
      + '<div class="field f-weight"><input type="number" step="0.25" inputmode="decimal" class="num" data-set="weight" data-ei="' + ei + '" data-si="' + si + '" value="' + st.weight + '"></div>'
      + '<div class="field f-rir"><select class="' + rirCls + '" data-set="score" data-ei="' + ei + '" data-si="' + si + '" title="RIR / Score je Satz">' + rirOpts + '</select></div>'
      + '<label class="field f-done done-chk" title="Satz erledigt"><input type="checkbox" data-set="done" data-ei="' + ei + '" data-si="' + si + '"' + (st.done ? " checked" : "") + '></label>'
      + '</div>' + sub;
  }
  function sorePicker(key, label, val) {
    return '<div class="bfield"><span>' + label + ' (Kater)</span><select data-body="' + key + '">'
      + [0, 1, 2, 3].map(function (v) { return '<option value="' + v + '"' + (val === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>';
  }
  function decLabel(d) {
    return ({ increase: "steigern", "increase-reps": "Wdh. steigern", hold: "halten", decrease: "senken" })[d] || "halten";
  }

  // Live-Inputs binden (ohne Voll-Re-Render, um Fokus zu halten)
  function bindLiveInputs() {
    var root = document.getElementById("app");
    root.querySelectorAll("[data-live]").forEach(function (el) {
      el.addEventListener("change", function () { setLivePath(el.getAttribute("data-live"), el.type === "checkbox" ? el.checked : (el.type === "number" ? parseFloat(el.value) : el.value)); });
    });
    root.querySelectorAll(".set-row [data-set]").forEach(function (el) {
      var ev = (el.type === "checkbox" || el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(ev, function () { onSetChange(el); });
    });
    // Klick-Ton + Vibration fuer jede Erledigt-Checkbox (on wie off)
    root.querySelectorAll(".done-chk input[type=checkbox]").forEach(function (el) {
      el.addEventListener("change", function () { clickTick(el.checked); });
    });
  }
  function setLivePath(path, val) {
    var parts = path.split("."); var o = UI.live;
    for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = val;
    persist();
  }
  function onSetChange(el) {
    var ei = +el.getAttribute("data-ei"), si = +el.getAttribute("data-si"), kind = el.getAttribute("data-set");
    if (kind === "w") { UI.live.entries[ei].warmupSets[si].done = el.checked; var wr = el.closest(".set-row"); if (wr) wr.classList.toggle("done", el.checked); persist(); return; }
    var st = UI.live.entries[ei].sets[si];
    if (kind === "reps") st.reps = parseInt(el.value, 10) || 0;
    else if (kind === "weight") { var nw = parseFloat(el.value); if (nw !== st.targetWeight) markAdjust(st, "Gewicht angepasst"); st.weight = isNaN(nw) ? 0 : nw; }
    else if (kind === "score") { st.score = +el.value; st.failed = (st.score === 5); }
    else if (kind === "failed") st.failed = el.checked;
    else if (kind === "done") { var wasDone = st.done; st.done = el.checked; if (!wasDone && st.done) onSetCompleted(ei, si); }
    if (kind === "reps" && st.reps < st.targetReps && st.done) { /* verfehlt – kein Auto-Fail, Nutzer entscheidet */ }
    refreshSetStatus(ei, si);
    persist();
  }
  function markAdjust(st, note) { st.adjusted = true; st.adjustNote = note; }
  function refreshSetStatus(ei, si) {
    var row = document.querySelector('.set-row.work[data-ei="' + ei + '"][data-si="' + si + '"]');
    if (!row) return;
    var st = UI.live.entries[ei].sets[si];
    row.classList.toggle("done", !!st.done);
    var sel = row.querySelector(".rir-sel");
    if (sel) { sel.classList.toggle("fail", st.score === 5); sel.classList.toggle("set", !!st.done); }
    var enX = UI.live.entries[ei];
    if ((exById(enX.exerciseId) || {}).category === "barbell") {
      var sub = document.querySelector('.set-sub[data-sub-ei="' + ei + '"][data-sub-si="' + si + '"]');
      if (sub) sub.innerHTML = plateHint(st.weight, entryBar(enX));
    }
  }

  // Workout beenden: bei sehr kurzer Dauer (< 5 min) nachfragen, sonst speichern.
  var MIN_WORKOUT_SEC = 300;
  function endWorkout() {
    var s = UI.live; if (!s) return;
    openEndModal();
  }
  function discardWorkout() { skipRest(); UI.live = null; DB.live = null; persist(); render(); scrollToTop(); }
  function ensureEndModal() {
    if (document.getElementById("ks-end-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-end-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Workout beenden">'
      + '<div class="ks-modal-head"><span class="ks-modal-title" id="ks-end-title">Workout beenden</span>'
      + '<button class="ks-modal-x" data-action="end-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="end-body" id="ks-end-body"></div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="end-save">Speichern</button>'
      + '<button class="btn danger" data-action="end-discard">Verwerfen</button>'
      + '<button class="btn ghost" data-action="end-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeEndModal(); });
    document.body.appendChild(ov);
  }
  function openEndModal() {
    ensureEndModal();
    var es = UI.live; var et = es ? tplById(es.templateId) : null;
    var endTitle = document.getElementById("ks-end-title");
    if (endTitle) endTitle.textContent = "Workout " + (et ? et.name : "") + " beenden";
    var body = document.getElementById("ks-end-body");
    if (body) body.innerHTML = endSummaryHTML();
    document.getElementById("ks-end-modal").classList.add("open");
  }
  // Kompakte Uebersicht der laufenden Session: pro Uebung die Arbeitssaetze
  // als Chips (erledigte gruen), oben Dauer und erledigt/gesamt.
  function endSummaryHTML() {
    var s = UI.live; if (!s) return "";
    var t = tplById(s.templateId);
    var sec = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
    var totalWork = 0, totalDone = 0;
    var rows = (s.entries || []).map(function (en) {
      var exo = exById(en.exerciseId);
      var sets = en.sets || [];
      var done = sets.filter(function (x) { return x.done; }).length;
      totalWork += sets.length; totalDone += done;
      var chips = sets.map(function (x) {
        return '<span class="es-set' + (x.done ? ' done' : '') + '">' + (x.reps || 0) + '\u00D7' + fmtNum(x.weight) + '</span>';
      }).join("");
      return '<div class="es-ex">'
        + '<div class="es-ex-head"><span class="es-name">' + esc(exo ? exo.name : en.exerciseId) + '</span>'
        + '<span class="es-count' + (sets.length && done === sets.length ? ' done' : '') + '">' + done + '/' + sets.length + '</span></div>'
        + (chips ? '<div class="es-sets">' + chips + '</div>' : '')
        + '</div>';
    }).join("");
    var warn = sec < MIN_WORKOUT_SEC ? '<div class="es-warn">Erst ' + fmtDur(sec) + ' trainiert (unter 5 Min).</div>' : '';
    return '<div class="es-meta"><span>Dauer ' + fmtDur(sec) + '</span><span>' + totalDone + '/' + totalWork + ' Sätze</span></div>'
      + warn
      + '<div class="es-list">' + rows + '</div>'
      + '<div class="es-hint">Speichern übernimmt nur erledigte Sätze in den Verlauf.</div>';
  }
  function closeEndModal() { var m = document.getElementById("ks-end-modal"); if (m) m.classList.remove("open"); }

  // Start-Popup: zeigt vor dem Start eine kompakte Vorschau (gleiche Optik
  // wie das Beenden-Popup) und startet erst nach Bestaetigung ("Los geht's").
  function ensureStartModal() {
    if (document.getElementById("ks-start-modal")) return;
    var ov = document.createElement("div");
    ov.id = "ks-start-modal"; ov.className = "ks-modal-overlay";
    ov.innerHTML = '<div class="ks-modal" role="dialog" aria-modal="true" aria-label="Workout starten">'
      + '<div class="ks-modal-head"><span class="ks-modal-title" id="ks-start-title">Workout starten</span>'
      + '<button class="ks-modal-x" data-action="start-cancel" aria-label="Schließen">\u2715</button></div>'
      + '<div class="end-body" id="ks-start-body"></div>'
      + '<div class="end-btns">'
      + '<button class="btn primary" data-action="start-go">Los geht\u2019s</button>'
      + '<button class="btn ghost" data-action="start-cancel">Abbrechen</button>'
      + '</div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) cancelStart(); });
    document.body.appendChild(ov);
  }
  function openStartModal(tplId) {
    UI.pendingLive = buildLive(tplId);
    ensureStartModal();
    var st = tplById(tplId);
    var titleEl = document.getElementById("ks-start-title");
    if (titleEl) titleEl.textContent = "Workout " + (st ? st.name : "") + " starten";
    var body = document.getElementById("ks-start-body");
    if (body) body.innerHTML = startSummaryHTML();
    document.getElementById("ks-start-modal").classList.add("open");
  }
  // Kompakte Vorschau der geplanten Session: pro Uebung die Arbeitssaetze
  // als Chips (reps x kg), oben Workout, Anzahl Uebungen und Saetze.
  function startSummaryHTML() {
    var s = UI.pendingLive; if (!s) return "";
    var t = tplById(s.templateId);
    var totalWork = 0;
    var rows = (s.entries || []).map(function (en) {
      var exo = exById(en.exerciseId);
      var sets = en.sets || [];
      totalWork += sets.length;
      var chips = sets.map(function (x) {
        return '<span class="es-set">' + (x.reps || 0) + '\u00D7' + fmtNum(x.weight) + '</span>';
      }).join("");
      return '<div class="es-ex">'
        + '<div class="es-ex-head"><span class="es-name">' + esc(exo ? exo.name : en.exerciseId) + '</span>'
        + '<span class="es-count">' + sets.length + ' \u00D7 Satz</span></div>'
        + (chips ? '<div class="es-sets">' + chips + '</div>' : '')
        + '</div>';
    }).join("");
    var bodyNote = todayBody() ? "" :
      '<div class="es-bodywarn"><div class="es-bw-txt"><strong>Körperzustand heute noch nicht erfasst</strong><span>Kurz eintragen, dann passen die Gewichtsvorschläge besser. Du kannst aber auch direkt starten.</span></div>'
      + '<button class="btn" data-action="start-to-body">Körperzustand eintragen</button></div>';
    return bodyNote
      + '<div class="es-list">' + rows + '</div>';
  }
  // Aus dem Start-Popup zum Koerper-Tab: Vorschau verwerfen, dort eintragen,
  // danach erneut starten (buildLive nutzt dann den neuen Koerperzustand).
  function startToBody() { UI.pendingLive = null; closeStartModal(); UI.tab = "body"; UI.menuOpen = false; render(); scrollToTop(); }
  function confirmStart() {
    if (!UI.pendingLive) { closeStartModal(); return; }
    UI.live = UI.pendingLive;
    UI.live.startedAt = Date.now();
    UI.pendingLive = null;
    DB.live = UI.live;
    closeStartModal();
    clickTick(true);
    persist();
    render();
    scrollToTop();
  }
  function cancelStart() { UI.pendingLive = null; closeStartModal(); }
  function closeStartModal() { var m = document.getElementById("ks-start-modal"); if (m) m.classList.remove("open"); }
  // Nach oben scrollen (window und ggf. scrollender Container), z. B. beim Start.
  function scrollToTop() {
    try { window.scrollTo(0, 0); } catch (e) {}
    try { if (document.scrollingElement) document.scrollingElement.scrollTop = 0; } catch (e) {}
    var app = document.getElementById("app"); if (app) app.scrollTop = 0;
  }

  function finishSession() {
    var s = UI.live;
    s.status = "done";
    s.endedAt = Date.now();
    if (s.startedAt) s.durationSec = Math.max(0, Math.round((s.endedAt - s.startedAt) / 1000));
    s.entries.forEach(function (en) {
      var exo = exById(en.exerciseId);
      // Nur tatsaechlich erledigte Saetze behalten – ungemachte verfallen und tauchen nicht im Verlauf auf
      en.warmupSets = (en.warmupSets || []).filter(function (x) { return x.done; });
      en.sets = (en.sets || []).filter(function (x) { return x.done; });
      if (!en.sets.length) { en.hadDeviation = false; en.est1RM = null; return; }
      en.sets.forEach(function (st) { st.metTarget = E.metTarget(st); });
      en.hadDeviation = E.hadDeviation(en.sets.filter(function (x) { return x.type !== "warmup"; }));
      var best = E.best1RMFromSets(en.sets, DB.settings.rmFormula);
      en.est1RM = best.value;
      // Übung aktualisieren: nächstes Arbeitsgewicht = höchstes geleistetes Arbeitsgewicht
      var ws = en.sets.filter(function (x) { return x.type !== "warmup" && x.done; });
      if (ws.length) { exo.workWeight = Math.max.apply(null, ws.map(function (x) { return x.weight; })); }
      if (best.value && (exo.metrics.indexOf("est1RM") >= 0)) { exo.rm = best.value; exo.rmAsOf = s.date; exo.rmStale = false; }
    });
    delete s.suggestionMeta;
    s.body = snapshotBody();
    s.entries.forEach(function (en) { delete en.suggestion; });
    // Übungen ohne erledigte Arbeitssätze nicht im Verlauf speichern
    s.entries = s.entries.filter(function (en) { return en.sets && en.sets.length; });
    DB.sessions.push(s);
    UI.live = null;
    DB.live = null;
    persist();
    UI.tab = "workouts"; render(); scrollToTop();
  }

  /* =========================================================
     View: Workouts (Liste + Kalender + Journey)
     ========================================================= */
  function journeyDashboardHTML() {
    var j = activeJourney();
    if (!j) return '';
    var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
    var cp = currentPhase();
    return '<div class="card journey">'
        + '<div class="journey-head"><strong>' + esc(j.name) + '</strong>' + (j.goal ? '<span class="jgoal">' + esc(j.goal) + '</span>' : '') + '<span class="hint">Start ' + esc(j.startDate) + '</span></div>'
        + '<div class="journey-chart" id="ks-journey-chart" style="width:100%;margin:6px 0 2px;overflow-x:auto;-webkit-overflow-scrolling:touch"></div>'
        + '<div class="phase-ctrl"><span>Aktuelle Phase: <strong>' + esc((cp || {}).name || "—") + '</strong>' + (cp && cp.repTarget ? ' · Ziel ' + cp.repTarget[0] + '–' + cp.repTarget[1] + ' Wdh' : '') + '</span>'
        + '<div class="wk-ctrl">Woche <button class="btn tiny ghost" data-action="wk" data-d="-1">−</button><strong class="wk-val">' + (j.currentWeek || 1) + '</strong><button class="btn tiny ghost" data-action="wk" data-d="1">+</button> / ' + ((cp || {}).weeks || "?") + '</div>'
        + '<button class="btn tiny ghost" data-action="phase-next">nächste Phase ›</button></div>'
        + '<div class="hint">Volumen-Empfehlung diese Woche: <strong>' + plannedSetCount() + ' Arbeitssätze</strong>/Übung'
        + (cp && cp.deloadWeek === (j.currentWeek) ? ' · <span class="warn-inline">Deload-Woche</span>' : '')
        + (!recoveryGreenNow() ? ' · <span class="warn-inline">Erholungsmarker gelb/rot → konservativ</span>' : '') + '</div>'
        + (idx >= j.phases.length - 1 ? '<div class="last-phase">Letzte Phase erreicht. <button class="btn tiny" data-action="journey-finish" data-id="' + j.id + '">Journey abschließen</button> <button class="btn tiny ghost" data-action="journey-picker">neue Journey starten</button></div>' : '')
        + '</div>';
  }
  // D3-Periodisierungsgrafik der aktiven Journey (Container #ks-journey-chart).
  function viewWorkouts() {
    var html = '<div class="section-title">Verlauf</div>';

    // Kalender / Liste – nur eine Ansicht gleichzeitig (Umschalter)
    var ss = doneSessions().slice().reverse();
    var view = UI.woView || "calendar";
    html += '<div class="wo-viewbar">'
      + '<div class="seg">'
      + '<button class="seg-btn' + (view === "calendar" ? " on" : "") + '" data-action="wo-view" data-v="calendar">Kalender</button>'
      + '<button class="seg-btn' + (view === "list" ? " on" : "") + '" data-action="wo-view" data-v="list">Liste (' + ss.length + ')</button>'
      + '</div></div>';

    if (view === "calendar") {
      html += calendarHTML();
    } else if (!ss.length) {
      html += '<div class="empty">Noch keine Sessions. Starte ein Workout im Training-Tab.</div>';
    } else {
      html += '<div class="log-list">' + ss.map(function (s) {
        if (s.type === "yoga") {
          return '<div class="log-item yoga">'
            + '<div class="log-date">' + esc(s.date) + '</div>'
            + '<div class="log-body">'
            + '<div class="log-top"><span class="log-wo"><span class="yoga-tag sm">YOGA</span> Yoga / Mobility</span></div>'
            + '<div class="log-sub">' + (s.minutes || 0) + ' min' + (s.notes ? ' · ' + esc(s.notes) : '') + '</div>'
            + '</div>'
            + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
            + '</div>';
        }
        var t = tplById(s.templateId);
        var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
        var vol = (s.entries || []).reduce(function (a, e) { return a + workVol(e); }, 0);
        return '<div class="log-item">'
          + '<div class="log-date">' + esc(s.date) + '</div>'
          + '<div class="log-body">'
          + '<div class="log-top"><span class="log-wo">Workout ' + esc(t ? t.name : "?") + '</span>'
          + (dev ? '<span class="dev-badge" title="Abweichung: geplant nicht erreicht / runterkorrigiert">Δ Abweichung</span>' : '<span class="ok-badge">im Plan</span>') + '</div>'
          + '<div class="log-sub">' + (s.entries || []).map(function (e) { var ex = exById(e.exerciseId); return esc(ex ? ex.name : e.exerciseId) + ' ' + setSummary(e); }).join(" · ") + '</div>'
          + '<div class="log-meta"><span class="log-vol">Vol ' + fmtNum(Math.round(vol)) + '</span>' + (s.durationSec ? '<span class="log-dur">Dauer ' + fmtDur(s.durationSec) + '</span>' : '') + '</div>'
          + '</div>'
          + '<button class="btn tiny ghost log-del" data-action="del-session" data-id="' + s.id + '">löschen</button>'
          + '</div>';
      }).join("") + '</div>';
    }
    return html;
  }
  function workVol(entry) { return (entry.sets || []).filter(function (s) { return s.type !== "warmup"; }).reduce(function (a, s) { return a + (s.reps || 0) * (s.weight || 0); }, 0); }
  function setSummary(entry) {
    var ws = (entry.sets || []).filter(function (s) { return s.type !== "warmup"; });
    if (!ws.length) return "";
    var top = Math.max.apply(null, ws.map(function (s) { return s.weight || 0; }));
    return ws.length + "×" + (ws[0].reps) + "@" + fmtNum(top);
  }
  function calMonth() { if (!UI.calMonth) { var n = new Date(); UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; } return UI.calMonth; }
  function calShift(d) { var c = calMonth(); var nm = c.m + d, ny = c.y; if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; } UI.calMonth = { y: ny, m: nm }; render(); }
  function calToday() { var n = new Date(); UI.calMonth = { y: n.getFullYear(), m: n.getMonth() }; render(); }
  function calendarHTML() {
    var cm = calMonth(); var y = cm.y, m = cm.m;
    var first = new Date(y, m, 1); var startDay = (first.getDay() + 6) % 7; var days = new Date(y, m + 1, 0).getDate();
    var byDate = {}; doneSessions().forEach(function (s) { (byDate[s.date] = byDate[s.date] || []).push(s); });
    var names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    var cells = names.map(function (n) { return '<div class="cal-dow">' + n + '</div>'; }).join("");
    for (var i = 0; i < startDay; i++) cells += '<div class="cal-cell empty"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = y + "-" + pad(m + 1) + "-" + pad(d);
      var has = byDate[ds];
      var dot = "";
      if (has) {
        dot = has.map(function (s) {
          if (s.type === "yoga") return '<span class="cal-dot yoga">Yoga</span>';
          var t = tplById(s.templateId); var dev = (s.entries || []).some(function (e) { return e.hadDeviation; });
          return '<span class="cal-dot' + (dev ? ' dev' : '') + '">' + (t ? t.name : "•") + '</span>';
        }).join("");
      }
      cells += '<div class="cal-cell' + (ds === today() ? ' today' : '') + '"><span class="cal-d">' + d + '</span>' + dot + '</div>';
    }
    var mn = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][m];
    return '<div class="card"><div class="cal-head">'
      + '<button class="btn tiny ghost" data-action="cal-prev" title="Vormonat">‹</button>'
      + '<span class="cal-title">' + mn + ' ' + y + '</span>'
      + '<div class="cal-nav-r"><button class="btn tiny ghost" data-action="cal-today">Heute</button><button class="btn tiny ghost" data-action="cal-next" title="Folgemonat">›</button></div>'
      + '</div><div class="calendar">' + cells + '</div></div>';
  }

  /* =========================================================
     View: Exercises (Liste + Detail)
     ========================================================= */
  var METRIC_LABELS = { rm: "1RM-Verlauf", weight: "Arbeitsgewicht (Top-Satz)", reps: "Wiederholungen (Summe Arbeitssätze)", volume: "Wochenvolumen", score: "Score-Verlauf" };
  function exerciseChartData(ex) {
    var h = exerciseHistory(ex.id);
    var bw = {}; h.forEach(function (x) { bw[x.week] = (bw[x.week] || 0) + x.vol; });
    var wk = Object.keys(bw).sort();
    return {
      rm: h.filter(function (x) { return x.est1RM; }).map(function (x) { return { y: x.est1RM, flag: x.dev }; }),
      weight: h.map(function (x) { return { y: x.topW, flag: x.dev }; }),
      reps: h.map(function (x) { return { y: x.reps, flag: x.dev }; }),
      score: h.map(function (x) { return { y: x.score, flag: x.dev }; }),
      volume: wk.map(function (w) { return { label: w.slice(-3), value: bw[w] }; })
    };
  }
  function exerciseChartSVG(data, metric) { return metric === "volume" ? barChart(data.volume, {}) : lineChart(data[metric] || [], {}); }
  function detailChartCard(ex, metric, svg) {
    var pinned = dashHas(ex.id, metric);
    return '<div class="card chart-card"><div class="sets-title chart-head"><span>' + METRIC_LABELS[metric] + '</span>'
      + '<button class="btn tiny ghost pin' + (pinned ? ' on' : '') + '" data-action="pin-chart" data-ex="' + ex.id + '" data-metric="' + metric + '">' + (pinned ? 'Angeheftet' : 'Anheften') + '</button></div>' + svg + '</div>';
  }
  function dashboardHTML() {
    if (!DASH.length) {
      return '<div class="section-title">Dashboard</div><div class="dash-empty">Noch keine Graphen angeheftet. Öffne eine Übung und tippe bei einem Diagramm auf „Anheften" – es erscheint dann hier oben.</div>';
    }
    var html = '<div class="section-title">Dashboard</div><div class="dash-grid">';
    DASH.forEach(function (it, i) {
      var ex = exById(it.exerciseId); if (!ex) return;
      var data = exerciseChartData(ex);
      html += '<div class="dash-tile" draggable="true" data-dash-idx="' + i + '">'
        + '<div class="dash-tile-head"><span class="dt-grip" title="Ziehen zum Sortieren">⠿</span>'
        + '<span class="dt-title">' + esc(ex.name) + ' · ' + METRIC_LABELS[it.metric] + '</span>'
        + '<span class="dt-actions">'
        + '<button class="btn tiny ghost" data-action="dash-up" data-i="' + i + '" title="nach oben">↑</button>'
        + '<button class="btn tiny ghost" data-action="dash-down" data-i="' + i + '" title="nach unten">↓</button>'
        + '<button class="btn tiny ghost danger" data-action="dash-del" data-i="' + i + '" title="entfernen">×</button>'
        + '</span></div>' + exerciseChartSVG(data, it.metric) + '</div>';
    });
    html += '</div>';
    return html;
  }

  function viewExercises() {
    var groups = { strength: [], core: [], inactive: [] };
    DB.exercises.forEach(function (e) { if (!e.active) groups.inactive.push(e); else if (e.profile === "core") groups.core.push(e); else groups.strength.push(e); });
    function row(e) {
      var bar = e.barId ? barById(e.barId) : null;
      var rm = e.rm ? fmtW(e.rm) + (e.rmStale ? ' <span class="stale">veraltet</span>' : '') : '–';
      return '<div class="ex-row" data-action="detail" data-id="' + e.id + '">'
        + '<div class="ex-main"><span class="ex-name">' + esc(e.name) + '</span><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(kindLabel(e.kind)) + (bar ? ' · ' + esc(bar.name) : '') + '</span></div>'
        + '<div class="ex-stats"><span>Arbeit ' + fmtW(e.workWeight) + '</span><span>1RM ' + rm + '</span><span class="ex-reps">' + e.repRange[0] + '–' + e.repRange[1] + '</span></div>'
        + '<span class="chev">›</span></div>';
    }
    var html = dashboardHTML();
    html += '<div class="section-title">Übungen</div>';
    html += '<div class="ex-group"><div class="grp-title">Kraft</div>' + groups.strength.map(row).join("") + '</div>';
    html += '<div class="ex-group"><div class="grp-title">Core</div>' + groups.core.map(row).join("") + '</div>';
    if (groups.inactive.length) html += '<div class="ex-group"><div class="grp-title">Inaktiv / Swaps</div>' + groups.inactive.map(row).join("") + '</div>';
    return html;
  }

  function exerciseHistory(exId) {
    var out = [];
    doneSessions().forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        if (en.exerciseId !== exId) return;
        var ws = (en.sets || []).filter(function (x) { return x.type !== "warmup"; });
        if (!ws.length) return;
        var topW = Math.max.apply(null, ws.map(function (x) { return x.weight || 0; }));
        var reps = ws.reduce(function (a, x) { return a + (x.reps || 0); }, 0);
        var vol = ws.reduce(function (a, x) { return a + (x.reps || 0) * (x.weight || 0); }, 0);
        var sc = ws.reduce(function (a, x) { return a + (x.score || 0); }, 0) / ws.length;
        out.push({ date: s.date, topW: topW, reps: reps, vol: vol, score: sc, est1RM: en.est1RM, dev: !!en.hadDeviation, week: isoWeek(s.date) });
      });
    });
    return out;
  }

  function viewExerciseDetail(exId) {
    var e = exById(exId); if (!e) { UI.detail = null; return viewExercises(); }
    var h = exerciseHistory(exId);
    var rmPts = h.filter(function (x) { return x.est1RM; }).map(function (x) { return { y: x.est1RM, flag: x.dev }; });
    var wPts = h.map(function (x) { return { y: x.topW, flag: x.dev }; });
    var rPts = h.map(function (x) { return { y: x.reps, flag: x.dev }; });
    var sPts = h.map(function (x) { return { y: x.score, flag: x.dev }; });
    // Wochenvolumen
    var byWeek = {}; h.forEach(function (x) { byWeek[x.week] = (byWeek[x.week] || 0) + x.vol; });
    var weeks = Object.keys(byWeek).sort(); var volItems = weeks.map(function (w) { return { label: w.slice(-3), value: byWeek[w] }; });

    var bar = e.barId ? barById(e.barId) : null;
    var sug = e.profile !== "core" ? suggestForExercise(e, currentPhase()) : null;

    var html = '<button class="btn ghost small back" data-action="ex-back">‹ Übungen</button>';
    html += '<div class="detail-head"><h2>' + esc(e.name) + '</h2><span class="ex-tags">' + esc(e.profile) + ' · ' + esc(kindLabel(e.kind)) + (bar ? ' · ' + esc(bar.name) + ' ' + fmtW(bar.weight) : '') + ' · ' + esc(e.muscleGroups.join(", ")) + '</span></div>';

    html += '<div class="metric-row">'
      + metric("Arbeitsgewicht", fmtW(e.workWeight))
      + metric("Repband", e.repRange[0] + "–" + e.repRange[1])
      + metric("1RM (geschätzt)", e.rm ? fmtW(e.rm) : "–")
      + metric("Sessions", h.length)
      + '</div>';

    if (sug) html += '<div class="card"><div class="sets-title">Nächster Vorschlag</div><div class="suggest-line big">' + fmtW(sug.weight) + ' · ' + sug.targetReps + ' Wdh <span class="dec dec-' + sug.decision + '">' + decLabel(sug.decision) + '</span></div><div class="note">' + esc(sug.note) + '</div></div>';

    html += detailChartCard(e, "rm", lineChart(rmPts, {}));
    html += detailChartCard(e, "weight", lineChart(wPts, {}));
    html += detailChartCard(e, "reps", lineChart(rPts, {}));
    html += detailChartCard(e, "volume", barChart(volItems, {}));
    html += detailChartCard(e, "score", lineChart(sPts, {}));
    html += '<div class="hint">Rote Punkte = Session mit Abweichung (Ziel verfehlt / runterkorrigiert). Über „Anheften" landet ein Diagramm oben im Dashboard.</div>';

    // Einstellungen je Übung
    html += '<div class="card"><div class="sets-title">Übung anpassen</div><div class="ex-edit">'
      + editNum("Arbeitsgewicht", "workWeight", e.workWeight, 0.25)
      + editNum("Repband min", "repmin", e.repRange[0], 1)
      + editNum("Repband max", "repmax", e.repRange[1], 1)
      + editNum("Ziel-Score", "targetScore", e.targetScore, 1)
      + '<label class="chk"><input type="checkbox" data-exedit="active" data-id="' + e.id + '"' + (e.active ? " checked" : "") + '> aktiv</label>'
      + '</div></div>';
    return html;
  }
  function metric(label, val) { return '<div class="metric"><span class="m-val">' + val + '</span><span class="m-label">' + label + '</span></div>'; }
  function chartCard(title, svg) { return '<div class="card chart-card"><div class="sets-title">' + title + '</div>' + svg + '</div>'; }
  function editNum(label, field, val, step) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="' + step + '" class="num" data-exedit="' + field + '" data-id="' + UI.detail + '" value="' + val + '"></label>'; }

  /* =========================================================
     View: Inventar
     ========================================================= */
  /* =========================================================
     View: Körper (eigener Bereich, 1×/Tag)
     ========================================================= */
  function viewBody() {
    var hasToday = !!todayBody();
    // Entwurf: was im Formular steht. Geladen aus heutigem Eintrag (falls
    // vorhanden), sonst leer. Wird erst per "Eintragen" gespeichert.
    if (!UI.bodyDraft) UI.bodyDraft = todayBody() ? cloneBody(todayBody()) : blankBody();
    var t = UI.bodyDraft;
    var adv = restAdvice();
    var lvlTitle = { rest: "Rest-Tag empfohlen", caution: "Vorsicht – reduziert trainieren", ok: "Bereit fürs Training", unknown: "Heute noch nicht erfasst" }[adv.level];
    var html = '<div class="section-title">Körperzustand</div>';
    html += '<p class="hint body-lead">Werte einstellen und „Eintragen" tippen – der Eintrag erscheint dann unten im Verlauf.</p>';
    html += '<div class="rest-card ' + adv.level + '"><div class="rc-main"><strong>' + lvlTitle + '</strong>' + (adv.reasons.length ? '<span>' + esc(adv.reasons.join(" · ")) + '</span>' : '<span>Körperzustand grün.</span>') + '</div></div>';
    html += '<div class="card body-form"><div class="sets-title">Heute (' + today() + ')' + (hasToday ? ' – erfasst, bearbeiten' : ' – noch nicht erfasst') + '</div>'
      + '<div class="body-grid">'
      + sorePicker("legs", "Beine", t.legs) + sorePicker("upper_body", "Oberkörper", t.upper_body) + sorePicker("overall", "Gesamt", t.overall)
      + '<div class="bfield"><span>Readiness</span><select data-body="readiness">' + [1, 2, 3, 4, 5].map(function (v) { return '<option value="' + v + '"' + (t.readiness === v ? " selected" : "") + '>' + v + '</option>'; }).join("") + '</select></div>'
      + '<label class="chk bfield"><input type="checkbox" data-body="pain.flag"' + (t.pain && t.pain.flag ? " checked" : "") + '> Schmerz (warnt)</label>'
      + '</div>'
      + '<textarea class="notes body-notes" data-body="notes" rows="4" placeholder="Notiz (optional, mehrzeilig)">' + esc(t.notes || "") + '</textarea>'
      + '<div class="hint scale-hint">Kater 0 keine · 1 leicht · 2 deutlich · 3 stark (Region wird im Vorschlag ausgeschlossen). Readiness 1 mies … 5 top.</div>'
      + '<div class="body-actions"><button class="btn primary" data-action="body-save">' + (hasToday ? 'Aktualisieren' : 'Eintragen') + '</button></div>'
      + '</div>';
    var log = sortedBodyLog().slice().reverse();
    html += '<div class="section-title">Verlauf (' + log.length + ')</div>';
    if (!log.length) html += '<div class="empty">Noch kein Eintrag. Stelle oben deine Werte ein und tippe „Eintragen".</div>';
    else html += '<div class="blog-list">' + log.map(function (e) {
      var isToday = e.date === today();
      return '<div class="blog-item' + (isToday ? ' today' : '') + '"><span class="bl-date">' + esc(e.date) + (isToday ? ' <span class="bl-today">heute</span>' : '') + '</span>'
        + '<span class="bl-vals">Beine ' + (e.legs || 0) + ' · OK ' + (e.upper_body || 0) + ' · Ges ' + (e.overall || 0) + ' · Rdy ' + (e.readiness || 3) + (e.pain && e.pain.flag ? ' · Schmerz' : '') + '</span>'
        + (e.notes ? '<span class="bl-note">' + esc(e.notes) + '</span>' : '')
        + '<button class="btn tiny ghost danger" data-action="body-del" data-d="' + esc(e.date) + '">×</button></div>';
    }).join("") + '</div>';
    return html;
  }
  function cloneBody(e) { return { date: e.date, legs: e.legs || 0, upper_body: e.upper_body || 0, overall: e.overall || 0, pain: { flag: !!(e.pain && e.pain.flag), note: (e.pain && e.pain.note) || "" }, readiness: e.readiness || 3, notes: e.notes || "" }; }
  // Formular-Aenderung wirkt nur auf den Entwurf, ohne Re-Render (Fokus halten),
  // und wird erst per body-save als heutiger Eintrag gespeichert.
  function onBodyChange(el) {
    var e = UI.bodyDraft || (UI.bodyDraft = blankBody()); var k = el.getAttribute("data-body");
    if (k === "pain.flag") { e.pain = e.pain || {}; e.pain.flag = el.checked; }
    else if (k === "notes") e.notes = el.value;
    else if (k === "readiness") e.readiness = +el.value;
    else e[k] = +el.value;
  }
  // Entwurf aktiv als heutigen Eintrag speichern (anlegen oder ueberschreiben).
  function saveBodyToday() {
    var d = UI.bodyDraft || blankBody();
    var e = todayBody();
    if (!e) { e = blankBody(); e.date = today(); DB.bodyLog.push(e); }
    e.legs = d.legs || 0; e.upper_body = d.upper_body || 0; e.overall = d.overall || 0;
    e.readiness = d.readiness || 3; e.pain = { flag: !!(d.pain && d.pain.flag), note: (d.pain && d.pain.note) || "" }; e.notes = d.notes || "";
    UI.bodyDraft = cloneBody(e);
    persist(); render(); toast("Körperzustand eingetragen (" + today() + ").");
  }
  function onBarPick(el) {
    var ei = +el.getAttribute("data-ei"); var barId = el.value;
    var en = UI.live && UI.live.entries[ei]; if (!en) return;
    en.barId = barId;
    var exo = exById(en.exerciseId);
    if (exo && exo.category === "barbell" && en.suggestion) {
      en.warmupSets = E.generateWarmup(en.suggestion.weight, barById(barId).weight, DB.inventory.plates, { isLift1: ei === 0, isDeadlift: /deadlift/i.test(en.exerciseId) });
    }
    persist(); render();
  }

  /* =========================================================
     View: Journey-Verwaltung (eigener Tab)
     ========================================================= */
  function viewJourneyManager() {
    var act = activeJourney();
    var html = journeyDashboardHTML();
    html += '<div class="section-title jl-title">Journeys<button class="btn primary addj" data-action="journey-picker">+ Neue aus Vorlage</button></div>';
    html += '<p class="hint jm-lead">Verwalte hier deine Trainingszyklen. Die aktive Journey steuert Phasen, Volumen und Wiederholungen im Training; ihr Verlauf ist im Verlauf-Tab sichtbar.</p>';
    if (!DB.journeys.length) {
      html += '<div class="card empty-journey"><p class="ej-lead">Noch keine Journey.</p><p class="hint">Wähle eine Vorlage, die zu deinem aktuellen Ziel passt.</p><button class="btn primary" data-action="journey-picker">Journey aus Vorlage wählen</button></div>';
      return html;
    }
    html += '<div class="jlist">' + DB.journeys.map(function (jj) {
      var wks = jj.phases.reduce(function (a, p) { return a + p.weeks; }, 0);
      var cur = jj.phases.find(function (p) { return p.id === jj.currentPhaseId; });
      var badge = jj.active ? '<span class="badge-active">aktiv</span>'
        : (jj.status === "archived" ? '<span class="badge-arch">archiviert' + (jj.endDate ? ' · ' + esc(jj.endDate) : '') + '</span>' : '<span class="badge-idle">inaktiv</span>');
      return '<div class="jrow' + (jj.active ? ' active' : '') + (jj.status === "archived" ? ' archived' : '') + '">'
        + '<div class="jr-main"><span class="jr-name">' + esc(jj.name) + '</span>'
        + '<span class="jr-meta">' + jj.phases.length + ' Phasen · ' + wks + ' Wo' + (jj.goal ? ' · ' + esc(jj.goal) : '') + (jj.active && cur ? ' · jetzt: ' + esc(cur.name) + ' W' + (jj.currentWeek || 1) : '') + '</span></div>'
        + '<div class="jr-status">' + badge + '</div>'
        + '<div class="jr-actions">'
        + (jj.active ? '' : '<button class="btn tiny ghost" data-action="journey-activate" data-id="' + jj.id + '">aktivieren</button>')
        + (jj.status !== "archived" ? '<button class="btn tiny ghost" data-action="journey-finish" data-id="' + jj.id + '">abschließen</button>' : '')
        + '<button class="btn tiny ghost danger" data-action="journey-del" data-id="' + jj.id + '">löschen</button>'
        + '</div></div>';
    }).join('') + '</div>';
    return html;
  }

  /* =========================================================
     View: Journey-Vorlagen-Auswahl
     ========================================================= */
  function viewJourneyPicker() {
    var html = '<button class="btn ghost small back" data-action="journey-picker-close">‹ Zurück</button>';
    html += '<div class="section-title">Journey wählen</div>';
    html += '<p class="hint pick-lead">Eine Journey gibt dir über mehrere Wochen einen roten Faden mit aufeinander aufbauenden Phasen. Wähle die, die zu deinem aktuellen Ziel passt – die aktuellen Arbeitsgewichte werden als Startbasis übernommen.</p>';
    html += '<div class="tpl-grid">' + JOURNEY_TEMPLATES.map(function (t) {
      var wks = templateWeeks(t);
      var track = t.phases.map(function (p) {
        return '<div class="tpl-pill"><span class="tp-n">' + esc(p.n) + '</span><span class="tp-m">' + p.w + ' Wo · ' + esc(focusLabel(p.f)) + (p.rt ? ' · ' + p.rt[0] + '–' + p.rt[1] + ' Wdh' : '') + '</span></div>';
      }).join('<span class="phase-arrow">›</span>');
      return '<div class="card tpl-card">'
        + '<div class="tpl-head"><h3>' + esc(t.name) + '</h3><span class="tpl-dur">' + wks + ' Wochen · ' + t.phases.length + ' Phasen</span></div>'
        + '<div class="tpl-tag">' + esc(t.tagline) + '</div>'
        + '<div class="tpl-for"><strong>Für:</strong> ' + esc(t.forWhom) + '</div>'
        + '<div class="tpl-summary">' + esc(t.summary) + '</div>'
        + '<div class="tpl-track">' + track + '</div>'
        + '<button class="btn primary" data-action="journey-create" data-tpl="' + t.id + '">Diese Journey starten</button>'
        + '</div>';
    }).join('') + '</div>';
    return html;
  }

  function viewInventory() {
    var html = '<div class="section-title">Inventar</div>';
    html += '<div class="card"><div class="sets-title">Stangen</div><div class="hint">Die erste Stange ist im Workout vorausgewählt. Reihenfolge zählt – Namen frei wählbar.</div><div class="bar-list">';
    DB.inventory.bars.forEach(function (b, i) {
      html += '<div class="bar-card">'
        + '<div class="bar-card-main"><input type="text" class="bar-name-inp" data-bar="name" data-i="' + i + '" value="' + esc(b.name) + '" placeholder="Stangenname">'
        + (i === 0 ? '<span class="def">Vorausgewählt</span>' : '') + '</div>'
        + '<div class="bar-card-controls">'
        + '<span class="bar-weight"><input type="number" step="0.5" class="num" data-bar="weight" data-i="' + i + '" value="' + b.weight + '"><span class="bar-unit">' + DB.settings.unit + '</span></span>'
        + (i === 0 ? '' : '<button class="btn tiny ghost bar-del" data-action="bar-del" data-i="' + i + '" title="Stange entfernen">×</button>')
        + '</div></div>';
    });
    html += '</div><button class="btn tiny ghost" data-action="bar-add">+ Stange</button></div>';

    html += '<div class="card"><div class="sets-title">Scheiben (pro Stück, kg)</div><div class="plate-chips">';
    DB.inventory.plates.slice().sort(function (a, b) { return a - b; }).forEach(function (p) {
      html += '<span class="plate-chip">' + fmtNum(p) + ' <button data-action="plate-del" data-p="' + p + '">×</button></span>';
    });
    html += '</div><div class="plate-add"><input type="number" step="0.25" class="num" id="plate-new" placeholder="z.B. 0.5"><button class="btn tiny ghost" data-action="plate-add">+ Scheibe</button></div>';
    html += '<div class="hint">Kleinster Sprung gesamt: <strong>' + fmtW(2 * E.plateGrid(DB.inventory.plates)) + '</strong></div></div>';

    return html;
  }

  /* =========================================================
     View: Einstellungen
     ========================================================= */
  function viewSettings() {
    var s = DB.settings;
    var html = '<div class="section-title">Einstellungen</div>';
    html += '<div class="card"><div class="sets-title">Engine & Einheiten</div><div class="settings-grid">'
      + '<label class="edit-field"><span>1RM-Formel</span><select data-set-setting="rmFormula">'
      + ["mean", "brzycki", "epley", "wathan"].map(function (f) { return '<option value="' + f + '"' + (s.rmFormula === f ? " selected" : "") + '>' + (f === "mean" ? "Mittelwert (B+E+W)" : f) + '</option>'; }).join("") + '</select></label>'
      + numSetting("Wochen-Frequenzziel", "weeklyFrequencyTarget", s.weeklyFrequencyTarget, 1)
      + numSetting("Schrittweite", "step", s.step, 0.25)
      + numSetting("Erholung Squat (h)", "rec_squat", s.recoveryWindows.squat, 1)
      + numSetting("Erholung Deadlift (h)", "rec_deadlift", s.recoveryWindows.deadlift, 1)
      + '<label class="edit-field"><span>Einheit</span><select data-set-setting="unit"><option value="kg"' + (s.unit === "kg" ? " selected" : "") + '>kg</option><option value="lb"' + (s.unit === "lb" ? " selected" : "") + '>lb</option></select></label>'
      + '</div></div>';

    var T = s.timers || {};
    html += '<div class="card"><div class="sets-title">Pausen-Timer</div>'
      + '<div class="settings-grid">'
      + timerNum("Satz-Pause (Sek.)", "setRestSec", T.setRestSec)
      + timerNum("Übungs-Pause (Sek.)", "exerciseRestSec", T.exerciseRestSec)
      + '</div>'
      + '<div class="timer-switches">'
      + timerChk("Pause automatisch starten", "autoStart", T.autoStart)
      + timerChk("Ton am Pausenende", "sound", T.sound)
      + timerChk("Vibration am Pausenende", "vibrate", T.vibrate)
      + '</div>'
      + '<div class="hint">Standardvorgaben für die Pausen zwischen Sätzen und zwischen Übungen. Im laufenden Training lässt sich eine Pause per Tippen für diesen einen Durchgang anpassen. Auto-Start, Ton und Vibration werden mit den nächsten Ausbaustufen wirksam; Vibration ist nicht auf allen Geräten verfügbar (auf iPhone-Safari nur Ton, und nur bei aktivem Display).</div>'
      + '</div>';

    html += '<div class="card"><div class="sets-title">Daten – Export / Import</div>'
      + '<div class="hint">JSON ist Backup und additive Schnittstelle zu Claude. Import in drei Modi.</div>'
      + '<div class="data-btns"><button class="btn ghost" data-action="export">Export (Download)</button>'
      + '<button class="btn ghost" data-action="export-copy">Export in Zwischenablage</button></div>'
      + '<div class="import-box"><textarea id="import-text" placeholder="JSON hier einfügen oder Datei wählen…"></textarea>'
      + '<input type="file" id="import-file" accept="application/json,.json">'
      + '<div class="import-modes">Modus: '
      + '<label><input type="radio" name="impmode" value="append" checked> Anhängen (additiv)</label>'
      + '<label><input type="radio" name="impmode" value="update"> Aktualisieren (nach ID)</label>'
      + '<label><input type="radio" name="impmode" value="replace"> Ersetzen (Voll-Restore)</label></div>'
      + '<button class="btn primary" data-action="import">Importieren</button></div>'
      + '</div>';

    html += '<div class="card"><div class="sets-title">Score ↔ RIR ↔ RPE</div><div class="score-table">'
      + [1, 2, 3, 4, 5].map(function (v) { var i = E.scoreInfo(v); return '<div class="score-cell"><strong>' + v + '</strong><span>RIR ' + i.rir + '</span><span>RPE ' + i.rpe + '</span><span class="sl">' + i.label + '</span></div>'; }).join("")
      + '</div><div class="hint">Ziel Arbeitssätze: Score 3–4 (RIR 1–3). Wiedereinstieg ≤ 3.</div></div>';
    return html;
  }
  function numSetting(label, field, val, step) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="' + step + '" class="num" data-set-setting="' + field + '" value="' + val + '"></label>'; }
  function timerNum(label, field, val) { return '<label class="edit-field"><span>' + label + '</span><input type="number" step="5" min="0" class="num" data-set-timer="' + field + '" value="' + (val == null ? "" : val) + '"></label>'; }
  function timerChk(label, field, val) { return '<label class="chk"><input type="checkbox" data-set-timer="' + field + '"' + (val ? " checked" : "") + '> ' + label + '</label>'; }

  /* =========================================================
     Import / Export
     ========================================================= */
  // Export-Anreicherung: score (1-5) bleibt einzige gepflegte Groesse;
  // rir/rpe/scoreLabel werden je Arbeitssatz aus SCORE_MAP abgeleitet, nur fuer den Export.
  function enrichExport(db) {
    var out = clone(db);
    (out.sessions || []).forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        (en.sets || []).forEach(function (st) {
          var info = (st && st.score != null) ? E.scoreInfo(st.score) : null;
          if (info) { st.rir = info.rir; st.rpe = info.rpe; st.scoreLabel = info.label; }
        });
      });
    });
    out._scoreScale = {
      note: "score (1-5) ist die gepflegte Groesse; rir/rpe/scoreLabel je Satz sind daraus abgeleitet und werden beim Re-Import verworfen.",
      map: clone(E.SCORE_MAP)
    };
    return out;
  }
  // Abgeleitete Felder vor dem Import entfernen, damit der Live-Zustand sauber bleibt.
  function stripDerived(data) {
    if (!data || typeof data !== "object") return data;
    delete data._scoreScale;
    (data.sessions || []).forEach(function (s) {
      (s.entries || []).forEach(function (en) {
        (en.sets || []).forEach(function (st) { delete st.rir; delete st.rpe; delete st.scoreLabel; });
      });
    });
    return data;
  }
  function exportText() { return JSON.stringify(enrichExport(DB), null, 2); }
  function download() {
    var blob = new Blob([exportText()], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "fitness-system_" + today() + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function importJSON(text, mode) {
    var data; try { data = JSON.parse(text); } catch (e) { alert("Ungültiges JSON: " + e.message); return; }
    data = stripDerived(data);
    if (mode === "replace") {
      if (!confirm("Ersetzen: alle aktuellen Daten werden überschrieben. Fortfahren?")) return;
      DB = data; migrate(DB); persist(); UI.detail = null; render(); toast("Ersetzt."); return;
    }
    // additiv / update – Teil-JSON erlaubt
    var sections = ["exercises", "templates", "journeys", "sessions"];
    var added = 0, updated = 0;
    sections.forEach(function (sec) {
      if (!Array.isArray(data[sec])) return;
      DB[sec] = DB[sec] || [];
      data[sec].forEach(function (item) {
        var existing = DB[sec].find(function (x) { return x.id === item.id; });
        if (existing) {
          if (mode === "update") { Object.assign(existing, item); updated++; }
          else { // append: ID-Kollision -> neue ID
            var copy = clone(item); copy.id = uid(sec.slice(0, 3) + "_"); DB[sec].push(copy); added++;
          }
        } else { DB[sec].push(clone(item)); added++; }
      });
    });
    // settings/inventory: nur bei update/replace übernehmen
    if (mode === "update") {
      if (data.settings) Object.assign(DB.settings, data.settings);
      if (data.inventory) Object.assign(DB.inventory, data.inventory);
    }
    persist(); render(); toast(added + " hinzugefügt, " + updated + " aktualisiert.");
  }

  /* =========================================================
     Events (Delegation)
     ========================================================= */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]"); if (!el) return;
    var a = el.getAttribute("data-action");
    switch (a) {
      case "tab": UI.tab = el.getAttribute("data-tab"); UI.detail = null; UI.journeyPicker = false; UI.menuOpen = false; UI.bodyDraft = null; render(); break;
      case "menu-toggle": UI.menuOpen = !UI.menuOpen; render(); break;
      case "auth-open": openAuthModal(); break;
      case "auth-close": closeAuthModal(); break;
      case "start": openStartModal(el.getAttribute("data-tpl")); break;
      case "start-go": confirmStart(); break;
      case "start-cancel": cancelStart(); break;
      case "start-to-body": startToBody(); break;
      case "finish-workout": endWorkout(); break;
      case "end-save": closeEndModal(); finishSession(); break;
      case "end-discard": closeEndModal(); discardWorkout(); break;
      case "end-cancel": closeEndModal(); break;
      case "rest-minus": adjustRest(-15); break;
      case "rest-plus": adjustRest(15); break;
      case "rest-skip": skipRest(); break;
      case "toggle-timers": toggleTimers(); break;
      case "add-set": addSet(+el.getAttribute("data-ei")); break;
      case "del-set": delSet(+el.getAttribute("data-ei")); break;
      case "detail": UI.detail = el.getAttribute("data-id"); render(); break;
      case "ex-back": UI.detail = null; render(); break;
      case "del-session": if (confirm("Session löschen?")) { DB.sessions = DB.sessions.filter(function (s) { return s.id !== el.getAttribute("data-id"); }); persist(); render(); } break;
      case "wk": adjustWeek(+el.getAttribute("data-d")); break;
      case "phase-next": nextPhase(); break;
      case "body-save": saveBodyToday(); break;
      case "body-del": var bd = el.getAttribute("data-d"); DB.bodyLog = DB.bodyLog.filter(function (e) { return e.date !== bd; }); if (bd === today()) UI.bodyDraft = blankBody(); persist(); render(); break;
      case "wo-view": UI.woView = el.getAttribute("data-v"); render(); break;
      case "cal-prev": calShift(-1); break;
      case "cal-next": calShift(1); break;
      case "cal-today": calToday(); break;
      case "toggle-plate": { var pe = el.getAttribute("data-ei"); if (!UI.plateShow) UI.plateShow = {}; UI.plateShow[pe] = !UI.plateShow[pe]; render(); break; }
      case "open-yoga": openYogaModal(); break;
      case "yoga-save": saveYoga(); break;
      case "yoga-cancel": closeYogaModal(); break;
      case "pin-chart": dashToggle(el.getAttribute("data-ex"), el.getAttribute("data-metric")); render(); break;
      case "dash-up": dashMove(+el.getAttribute("data-i"), -1); render(); break;
      case "dash-down": dashMove(+el.getAttribute("data-i"), 1); render(); break;
      case "dash-del": dashRemove(+el.getAttribute("data-i")); render(); break;
      case "journey-picker": UI.tab = "journey"; UI.journeyPicker = true; render(); break;
      case "journey-picker-close": UI.journeyPicker = false; render(); break;
      case "journey-create": createJourneyFromTemplate(el.getAttribute("data-tpl")); break;
      case "journey-activate": activateJourney(el.getAttribute("data-id")); break;
      case "journey-finish": if (confirm("Journey abschließen und archivieren? Der Verlauf bleibt erhalten.")) finishJourney(el.getAttribute("data-id")); break;
      case "journey-del": if (confirm("Journey wirklich löschen? Sessions bleiben erhalten.")) deleteJourney(el.getAttribute("data-id")); break;
      case "bar-add": DB.inventory.bars.push({ id: uid("bar_"), name: "Stange", weight: 20, default: false }); persist(); render(); break;
      case "bar-del": var bi = +el.getAttribute("data-i"); if (bi === 0) { toast("Die erste Stange ist die Vorauswahl und kann nicht gelöscht werden."); } else { DB.inventory.bars.splice(bi, 1); persist(); render(); } break;
      case "plate-del": DB.inventory.plates = DB.inventory.plates.filter(function (p) { return p !== parseFloat(el.getAttribute("data-p")); }); persist(); render(); break;
      case "plate-add": addPlate(); break;
      case "loader-calc": loaderCalc(); break;
      case "export": download(); break;
      case "export-copy": copyExport(); break;
      case "import": doImport(); break;
    }
  });

  // Übungs-Edit & Settings-Inputs (Delegation auf change)
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.hasAttribute && el.hasAttribute("data-exedit")) { exEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-set-setting")) { settingEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-set-timer")) { timerEdit(el); }
    else if (el.hasAttribute && el.hasAttribute("data-body")) { onBodyChange(el); }
    else if (el.hasAttribute && el.hasAttribute("data-barpick")) { onBarPick(el); }
    else if (el.hasAttribute && el.hasAttribute("data-bar")) {
      var i = +el.getAttribute("data-i"); var field = el.getAttribute("data-bar");
      if (field === "name") DB.inventory.bars[i].name = el.value;
      else DB.inventory.bars[i].weight = parseFloat(el.value) || 0;
      persist();
    }
  });

  // Dashboard: Drag-and-drop zum Sortieren (Desktop); Pfeile als Fallback für Touch
  var dashDragFrom = null;
  document.addEventListener("dragstart", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t) return;
    dashDragFrom = +t.getAttribute("data-dash-idx");
    if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", String(dashDragFrom)); } catch (e) {} }
  });
  document.addEventListener("dragover", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t || dashDragFrom === null) return;
    ev.preventDefault(); t.classList.add("drop-target");
  });
  document.addEventListener("dragleave", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (t) t.classList.remove("drop-target");
  });
  document.addEventListener("drop", function (ev) {
    var t = ev.target.closest && ev.target.closest(".dash-tile"); if (!t || dashDragFrom === null) return;
    ev.preventDefault(); var to = +t.getAttribute("data-dash-idx");
    dashReorder(dashDragFrom, to); dashDragFrom = null; render();
  });
  document.addEventListener("dragend", function () { dashDragFrom = null; });

  function addSet(ei) {
    var en = UI.live.entries[ei]; var last = en.sets[en.sets.length - 1] || { reps: 8, weight: barById(exById(en.exerciseId).barId).weight, score: 3 };
    en.sets.push({ reps: last.targetReps || last.reps, weight: last.targetWeight || last.weight, score: exById(en.exerciseId).targetScore, failed: false, done: false, targetReps: last.targetReps || last.reps, targetWeight: last.targetWeight || last.weight, adjusted: false, adjustNote: "" });
    en.plannedSets.push({ reps: last.targetReps || last.reps, weight: last.targetWeight || last.weight, targetScore: exById(en.exerciseId).targetScore });
    persist(); render();
  }
  function delSet(ei) { var en = UI.live.entries[ei]; if (en.sets.length > 1) { en.sets.pop(); en.plannedSets.pop(); persist(); render(); } }
  function adjustWeek(d) { var j = activeJourney(); var ph = currentPhase(); j.currentWeek = Math.max(1, Math.min(ph ? ph.weeks : 99, (j.currentWeek || 1) + d)); persist(); render(); }
  function nextPhase() {
    var j = activeJourney(); if (!j) return;
    var idx = j.phases.findIndex(function (p) { return p.id === j.currentPhaseId; });
    if (idx < j.phases.length - 1) { j.currentPhaseId = j.phases[idx + 1].id; j.currentWeek = 1; persist(); render(); }
    else toast("Letzte Phase erreicht. Journey abschließen oder eine neue starten.");
  }
  /* ---- Journey-Verwaltung ---- */
  function createJourneyFromTemplate(tplId) {
    var t = JOURNEY_TEMPLATES.find(function (x) { return x.id === tplId; }); if (!t) return;
    var phases = t.phases.map(function (p, i) { return phase("p" + i, p.n, p.f, p.w, p.s0, p.s1, p.dl, p.rt); });
    DB.journeys.forEach(function (j) { j.active = false; });
    var nj = {
      id: uid("j_"), name: t.name, goal: t.tagline, templateId: t.id,
      active: true, status: "active", startDate: today(),
      currentPhaseId: phases[0].id, currentWeek: 1, phases: phases
    };
    DB.journeys.push(nj);
    UI.journeyPicker = false; UI.tab = "workouts";
    persist(); render();
    toast("Journey \u201E" + t.name + "\u201C gestartet \u2013 Startbasis sind deine aktuellen Arbeitsgewichte.");
  }
  function activateJourney(id) {
    DB.journeys.forEach(function (j) { j.active = (j.id === id); if (j.id === id && j.status === "archived") j.status = "active"; });
    persist(); render();
  }
  function finishJourney(id) {
    var j = DB.journeys.find(function (x) { return x.id === id; }); if (!j) return;
    j.status = "archived"; j.active = false; j.endDate = today();
    var next = DB.journeys.find(function (x) { return x.status !== "archived"; });
    if (next) next.active = true;
    persist(); render();
    toast("Journey abgeschlossen und archiviert.");
  }
  function deleteJourney(id) {
    var wasActive = (DB.journeys.find(function (x) { return x.id === id; }) || {}).active;
    DB.journeys = DB.journeys.filter(function (x) { return x.id !== id; });
    if (wasActive) { var next = DB.journeys.find(function (x) { return x.status !== "archived"; }) || DB.journeys[0]; if (next) next.active = true; }
    persist(); render();
  }
  function exEdit(el) {
    var id = el.getAttribute("data-id"); var e = exById(id); if (!e) return; var f = el.getAttribute("data-exedit");
    if (f === "active") e.active = el.checked;
    else if (f === "workWeight") e.workWeight = parseFloat(el.value) || 0;
    else if (f === "targetScore") e.targetScore = parseInt(el.value, 10) || 3;
    else if (f === "repmin") e.repRange[0] = parseInt(el.value, 10) || 1;
    else if (f === "repmax") e.repRange[1] = parseInt(el.value, 10) || 1;
    persist(); render();
  }
  function settingEdit(el) {
    var f = el.getAttribute("data-set-setting"); var s = DB.settings;
    if (f === "rmFormula" || f === "unit") s[f] = el.value;
    else if (f === "rec_squat") s.recoveryWindows.squat = parseInt(el.value, 10) || 48;
    else if (f === "rec_deadlift") s.recoveryWindows.deadlift = parseInt(el.value, 10) || 72;
    else s[f] = parseFloat(el.value) || s[f];
    persist(); render();
  }
  function timerEdit(el) {
    var f = el.getAttribute("data-set-timer"); var T = DB.settings.timers = DB.settings.timers || {};
    if (f === "setRestSec" || f === "exerciseRestSec") { var v = parseInt(el.value, 10); T[f] = (isNaN(v) || v < 0) ? 0 : v; }
    else T[f] = el.checked;
    persist();
  }
  function addPlate() { var inp = document.getElementById("plate-new"); var v = parseFloat(inp.value); if (v > 0 && DB.inventory.plates.indexOf(v) < 0) { DB.inventory.plates.push(v); persist(); render(); } }
  function loaderCalc() {
    var tgt = parseFloat(document.getElementById("loader-target").value);
    var barId = document.getElementById("loader-bar").value; var bar = barById(barId);
    var ld = E.nearestLoadable(tgt, bar.weight, DB.inventory.plates, false);
    var pl = plateLoaderSVG(ld, bar);
    document.getElementById("loader-out").innerHTML = '<div class="plate-wrap">' + pl.svg + '<div class="plate-label">Ziel ' + fmtW(tgt) + ' → ladbar <strong>' + fmtW(ld) + '</strong> · ' + pl.label + '</div></div>';
  }
  function doImport() {
    var mode = (document.querySelector('input[name="impmode"]:checked') || {}).value || "append";
    var ta = document.getElementById("import-text"); var fileInp = document.getElementById("import-file");
    if (fileInp.files && fileInp.files[0]) {
      var r = new FileReader(); r.onload = function () { importJSON(r.result, mode); }; r.readAsText(fileInp.files[0]); return;
    }
    if (ta.value.trim()) importJSON(ta.value, mode);
    else alert("Bitte JSON einfügen oder Datei wählen.");
  }
  function copyExport() {
    var txt = exportText();
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("In Zwischenablage kopiert."); }, function () { fallbackCopy(txt); });
    else fallbackCopy(txt);
  }
  function fallbackCopy(txt) { var ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("kopiert."); } catch (e) {} ta.remove(); }

  /* =========================================================
     Toast / Store-Hinweis
     ========================================================= */
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.classList.add("show"); }, 10);
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }
  function flashStore() { toast("Speichern fehlgeschlagen – bitte exportieren."); }

  /* geteilte Helfer/State fuer ausgelagerte Module (charts.js u.a.).
     db() ist ein Getter, damit die Referenz nach setDB() korrekt bleibt. */
  KS.db = function () { return DB; };
  KS.esc = esc;
  KS.fmtNum = fmtNum;
  KS.fmtW = fmtW;
  KS.activeJourney = activeJourney;
  KS.UI = UI;

  /* init */
  window.KS_APP = {
    getDB: function () { return DB; },
    setDB: function (db) { DB = db; if (typeof migrate === "function") migrate(DB); UI.live = (DB.live && DB.live.status === "live") ? DB.live : null; Store.save(DB); render(); },
    schema: SCHEMA
  };
  render();
  if (window.KSSync) {
    window.KSSync.onAuthChange = function () { refreshAuthIcon(); };
    window.KSSync.boot();
  }
  ensureAuthModal();
  window.__FS = { DB: function () { return DB; }, E: E }; // Debug-Hook
})();
