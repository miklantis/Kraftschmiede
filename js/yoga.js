/* Fitness-System – Yoga/Mobility-Eintrag (Schema 0.14). Vanilla JS, framework-frei.
   Ausgelagert aus app.js: eigenes, in sich geschlossenes Feature mit Karte im
   Training-Tab und Eintrag-Popup. Haengt seine Funktionen an window.KS; app.js
   ruft sie ueber lokale Delegates auf. Geteilte Helfer kommen ueber KS
   (db/today/persist/render/toast), damit die Referenzen nach setDB() stimmen. */
(function () {
  "use strict";
  var KS = (window.KS = window.KS || {});

  // Karte im Training-Tab. Optisch wie ein Workout (16:9-Banner), aber blau
  // gehalten und ohne Suitability-Logik: traegt einfach eine Einheit fuer heute ein.
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
    var d = dateStr || KS.today();
    var m = (min != null && !isNaN(min)) ? min : 80;
    var DB = KS.db();
    DB.sessions.push({ id: "y_" + d.replace(/-/g, "") + "_" + Math.floor(Math.random() * 1000), date: d, type: "yoga", minutes: m, notes: "", status: "done", entries: [] });
    KS.persist(); KS.render(); KS.toast("Yoga-Einheit eingetragen (" + d + ").");
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
    var dEl = document.getElementById("ks-yoga-date"); if (dEl) dEl.value = KS.today();
    var mEl = document.getElementById("ks-yoga-min"); if (mEl) mEl.value = 80;
    document.getElementById("ks-yoga-modal").classList.add("open");
  }
  function closeYogaModal() { var m = document.getElementById("ks-yoga-modal"); if (m) m.classList.remove("open"); }
  function saveYoga() {
    var d = (document.getElementById("ks-yoga-date") || {}).value || KS.today();
    var m = parseInt((document.getElementById("ks-yoga-min") || {}).value, 10);
    closeYogaModal();
    addYoga(d, isNaN(m) ? 80 : m);
  }

  KS.yogaCard = yogaCard;
  KS.addYoga = addYoga;
  KS.openYogaModal = openYogaModal;
  KS.closeYogaModal = closeYogaModal;
  KS.saveYoga = saveYoga;
})();
