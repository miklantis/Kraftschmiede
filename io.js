/* Kraftschmiede – io.js (Schema 0.14). Vanilla JS, framework-frei.
   Import/Export der gesamten Datenbasis als JSON (Datei, Zwischenablage,
   Texteingabe). Aus app.js ausgelagert. Export reichert je Satz rir/rpe/
   scoreLabel aus E.SCORE_MAP an (nur fuer den Export), Import verwirft diese
   abgeleiteten Felder wieder. Greift ueber window.KS auf State und Helfer zu:
   db() (Getter), KS.replaceDB (ersetzt den kompletten Zustand inkl. migrate),
   clone/uid/today/persist/render/toast. Setzt window.FSE (engine.js) voraus. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});
  var E = window.FSE;

  /* duenne Wrapper auf geteilte Funktionen (window.KS) */
  function db() { return KS.db(); }
  function clone() { return KS.clone.apply(null, arguments); }
  function uid() { return KS.uid.apply(null, arguments); }
  function today() { return KS.today.apply(null, arguments); }
  function persist() { return KS.persist.apply(null, arguments); }
  function render() { return KS.render.apply(null, arguments); }
  function toast() { return KS.toast.apply(null, arguments); }

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
  function exportText() { return JSON.stringify(enrichExport(db()), null, 2); }
  function download() {
    var blob = new Blob([exportText()], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "fitness-system_" + today() + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function importJSON(text, mode) {
    var data; try { data = JSON.parse(text); } catch (e) { alert("Ungültiges JSON: " + e.message); return; }
    data = stripDerived(data);
    var DB = db();
    if (mode === "replace") {
      if (!confirm("Ersetzen: alle aktuellen Daten werden überschrieben. Fortfahren?")) return;
      KS.replaceDB(data); toast("Ersetzt."); return;
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

  KS.download = download;
  KS.doImport = doImport;
  KS.copyExport = copyExport;
})();
