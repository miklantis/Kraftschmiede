// Tagestexte des Fastenbegleiters (Buchinger-Methode, Vorhaben #503): je
// Fastentag ein Titel, was im Koerper passiert, wie man sich fuehlen kann und
// die Stichpunkte fuer heute. Der persoenliche Rahmen (Tee, Wasser, eine
// Gemuesebruehe, bei Schwaeche Honig) und die Warnzeichen stehen nicht hier,
// sondern fest im Fuss der Box - sie sind an jedem Tag gleich.
//
// Neue Konten bekommen die Texte ueber den Seed (nachziehend je Tag, siehe
// `seedWrite.ts`), Bestandskonten ueber Migration 0066 mit demselben Wortlaut.
// Der Gleichlauf beider Seiten ist ein Test (`fastenTage.test.ts`): wer hier
// einen Text aendert, muss ihn per Migration auch in der Datenbank aendern.

export interface FastenTagSeed {
  /** Fastentag, 1-basiert. Stabiler Seed-Identifikator. */
  tag: number;
  titel: string;
  /** Was im Koerper passiert. */
  koerper: string;
  /** Wie man sich fuehlen kann. */
  gefuehl: string;
  /** Stichpunkte „Heute wichtig“. */
  wichtig: string[];
}

export const fastenTagSeeds: readonly FastenTagSeed[] = [
  {
    tag: 1,
    titel: "Der Einstieg",
    koerper:
      "Dein Körper lebt heute noch von den Vorräten der letzten Mahlzeiten. Die Zuckerspeicher der Leber reichen etwa einen Tag, danach beginnt die Umstellung auf die Reserven. Klassisch nach Buchinger wird heute der Darm entleert, damit das Hungergefühl schneller nachlässt.",
    gefuehl:
      "Hunger meldet sich vor allem zu den gewohnten Essenszeiten – das ist Gewohnheit, kein echter Mangel. Manche sind unruhig oder gereizt.",
    wichtig: [
      "Über den Tag 2,5–3 Liter Wasser und Kräutertee trinken",
      "Mittags die Gemüsebrühe langsam und bewusst löffeln",
      "Wenn du nach Buchinger entleerst: Glaubersalz am Morgen, danach viel trinken",
      "Den Tag ruhig planen, kein Training",
    ],
  },
  {
    tag: 2,
    titel: "Die Umstellung läuft",
    koerper:
      "Die Zuckerspeicher sind weitgehend leer. Um das Gehirn zu versorgen, bildet die Leber jetzt Zucker aus Eiweiß und Fett, und die Fettverbrennung zieht an. Mit dem Zucker verliert der Körper viel gebundenes Wasser – die Waage fällt deshalb anfangs schnell.",
    gefuehl:
      "Kopfschmerzen, Frieren und Müdigkeit sind heute häufig, oft auch als Entzug von Kaffee und Zucker. Der Kreislauf kann träge sein.",
    wichtig: [
      "Viel trinken hilft gegen Kopfschmerzen",
      "Langsam aufstehen, besonders morgens und nach dem Liegen",
      "Warm anziehen, eine Wärmflasche tut gut",
      "Kurzer Spaziergang an der frischen Luft",
    ],
  },
  {
    tag: 3,
    titel: "Durchhalten lohnt sich",
    koerper:
      "Die Leber bildet aus Fett zunehmend Ketonkörper, die Ketose setzt ein. Sie werden zum zweiten Brennstoff, auch für das Gehirn. Zungenbelag und Mundgeruch zeigen, dass der Stoffwechsel umschaltet.",
    gefuehl:
      "Für viele ist heute der härteste Tag: Hunger, schlechte Laune, wenig Antrieb – die klassische Fastenkrise. Sie geht vorbei, meist schon morgen.",
    wichtig: [
      "Zunge morgens reinigen, öfter Zähne putzen",
      "Bei Schwäche ½ TL Honig in den Tee",
      "Ablenkung suchen: Spaziergang, Lesen, früh ins Bett",
      "Wenn du nach Buchinger entleerst: ab heute etwa alle zwei Tage (Einlauf oder Bittersalz)",
    ],
  },
  {
    tag: 4,
    titel: "Der Hunger wird leiser",
    koerper:
      "Deine Kohlenhydratspeicher sind aufgebraucht. Die Leber baut jetzt Fett zu Ketonkörpern um, und dein Gehirn gewinnt einen immer größeren Teil seiner Energie daraus. Die Umstellung auf den Fastenstoffwechsel ist weitgehend geschafft.",
    gefuehl:
      "Bei vielen lässt der Hunger heute nach und die Energie kommt zurück. Kopfschmerzen der ersten Tage klingen meist ab. Beim schnellen Aufstehen kann es noch kurz schwindeln.",
    wichtig: [
      "2,5–3 Liter Wasser und Kräutertee",
      "Mittags die Gemüsebrühe langsam löffeln",
      "Spaziergang oder Yoga statt Training",
      "Langsam aufstehen",
    ],
  },
  {
    tag: 5,
    titel: "Leichtigkeit",
    koerper:
      "Der Fastenstoffwechsel läuft. Fett ist jetzt der Hauptbrennstoff, und weil das Gehirn viel Energie aus Ketonkörpern bezieht, muss der Körper weniger Eiweiß zu Zucker umbauen. Die Gewichtsabnahme wird langsamer: Das schnelle Wasser ist weg, jetzt geht es an die Reserven.",
    gefuehl:
      "Viele erleben um diese Tage ein Stimmungshoch: klarer Kopf, Leichtigkeit, gute Laune. Genieß es, aber übernimm dich nicht.",
    wichtig: [
      "Die Energie für Bewegung nutzen: längerer Spaziergang oder Yoga",
      "Trotz guter Form kein Krafttraining",
      "Mittagsruhe einplanen, klassisch mit warmem Leberwickel",
      "Weiter reichlich trinken",
    ],
  },
  {
    tag: 6,
    titel: "Im Rhythmus",
    koerper:
      "Dein Körper hat sich auf die Selbstversorgung eingestellt. Blutzucker und Insulin bleiben niedrig und gleichmäßig, das erleichtert die Fettverbrennung. Der Darm ruht weitgehend.",
    gefuehl:
      "Der Tag fühlt sich oft ruhig und gleichmäßig an. Der Schlaf kann leichter oder kürzer sein, ohne dass du tagsüber müde bist.",
    wichtig: [
      "Feste Zeiten für Tee und Brühe geben dem Tag Struktur",
      "Abends zur Ruhe kommen: warmes Fußbad, Tee, früh ins Bett",
      "Bewegung an der frischen Luft",
    ],
  },
  {
    tag: 7,
    titel: "Eine Woche geschafft",
    koerper:
      "Nach einer Woche hat dein Körper etwa ein bis zwei Kilo Fett verbraucht, dazu Wasser. Blutdruck und Blutzucker sinken bei vielen in dieser Phase. Die Haut kann vorübergehend unreiner oder trockener werden.",
    gefuehl:
      "Stolz ist angebracht. Manchmal tauchen jetzt Gedanken und Gefühle auf, die im Alltag keinen Platz hatten – auch das gehört zum Fasten.",
    wichtig: [
      "Zwischenbilanz ziehen: Wie geht es dir, was tut dir gut?",
      "Haut pflegen, warm statt heiß duschen",
      "Weiter Spaziergang oder Yoga",
      "Langsam aufstehen, der Blutdruck ist oft niedriger",
    ],
  },
  {
    tag: 8,
    titel: "Die zweite Woche",
    koerper:
      "Fett liefert jetzt den größten Teil deiner Energie, Ketonkörper versorgen das Gehirn zu einem guten Teil. Der Körper schont dabei sein Muskeleiweiß, so gut er kann – Bewegung gibt ihm das Signal, die Muskeln zu erhalten.",
    gefuehl:
      "Das Fasten wird Routine. An manchen Tagen fehlt der Antrieb, an anderen fühlst du dich erstaunlich wach.",
    wichtig: [
      "Täglich bewegen: Spaziergang oder Yoga erhalten die Muskeln",
      "Die Brühe nicht auslassen, sie liefert Salz und Mineralstoffe",
      "Fachleute raten, länger als etwa eine Woche nur mit ärztlicher Begleitung zu fasten – eine kurze Rücksprache gibt Sicherheit",
    ],
  },
  {
    tag: 9,
    titel: "Ruhige Tiefe",
    koerper:
      "Dein Stoffwechsel läuft sparsam: Der Grundumsatz sinkt etwas, der Körper haushaltet mit seiner Energie. Entzündungswerte können sinken, bei manchen lassen Gelenk- oder Hautbeschwerden nach.",
    gefuehl:
      "Häufig spürbar: Kälteempfinden, langsamere Bewegungen, ein ruhiges, nach innen gewandtes Gefühl.",
    wichtig: [
      "Warm halten: Socken, Decke, Wärmflasche",
      "Mittagsruhe, klassisch mit Leberwickel",
      "Sanftes Yoga statt fordernder Einheiten",
      "Wenn du nach Buchinger entleerst: weiter etwa alle zwei Tage",
    ],
  },
  {
    tag: 10,
    titel: "Zehn Tage",
    koerper:
      "Die Fettreserven tragen dich zuverlässig. Der Harnsäurespiegel kann beim Fasten ansteigen, weil Ketonkörper und Harnsäure über die Nieren um die Ausscheidung konkurrieren – reichlich trinken hilft.",
    gefuehl:
      "Viele erleben um den zehnten Tag noch einmal einen Durchhänger. Das ist kein Zeichen, dass etwas schiefläuft.",
    wichtig: [
      "Die Trinkmenge halten: 2,5–3 Liter",
      "Gelenkschmerzen, besonders im großen Zeh, ärztlich abklären lassen (Harnsäure)",
      "Ein Spaziergang in der Sonne hebt die Stimmung",
    ],
  },
  {
    tag: 11,
    titel: "Gelassenheit",
    koerper:
      "Der Körper ist tief im Fastenstoffwechsel. Die Verdauungsorgane ruhen, die Darmflora stellt sich auf die veränderte Lage ein. Der Blutdruck bleibt oft niedriger als sonst.",
    gefuehl:
      "Hunger spielt kaum noch eine Rolle. Essensgerüche können dich trotzdem stark anziehen – das ist normal.",
    wichtig: [
      "Kochen und Essensgerüche möglichst meiden",
      "Bewusst Pausen machen, Ruhe gehört zum Fasten",
      "Langsam aufstehen, Treppen gemächlich nehmen",
      "Tee und Brühe zu festen Zeiten",
    ],
  },
  {
    tag: 12,
    titel: "Kraft einteilen",
    koerper:
      "Die Muskeln wirken flacher, weil ihnen Glykogen und Wasser fehlen. Ein Teil davon ist kein echter Muskelverlust und kommt nach dem Fasten schnell zurück. Leichte Bewegung hält die Muskulatur aktiv.",
    gefuehl:
      "Kraft und Ausdauer sind spürbar geringer, der Kopf bleibt oft klar. Wadenkrämpfe können auf fehlende Mineralstoffe hinweisen.",
    wichtig: [
      "Yoga oder Dehnen für die Beweglichkeit",
      "Die Brühe ruhig kräftig salzen",
      "Bei häufigen Krämpfen ärztlich klären, ob Magnesium sinnvoll ist",
      "Nichts Schweres heben",
    ],
  },
  {
    tag: 13,
    titel: "Vorausdenken",
    koerper:
      "Dein Körper zehrt ruhig von seinen Reserven. Die Leber bildet weiter Ketonkörper, der Wasserhaushalt hat sich eingependelt.",
    gefuehl:
      "Oft wächst jetzt die Vorfreude aufs Essen – oder der Wunsch, noch weiterzumachen. Beides ist in Ordnung.",
    wichtig: [
      "Endet dein Fasten bald: das Fastenbrechen vorbereiten – Äpfel, Kartoffeln und Gemüse einkaufen",
      "Die ersten Tage danach bewusst leicht planen",
      "Weiter täglich Spaziergang oder Yoga",
    ],
  },
  {
    tag: 14,
    titel: "Zwei Wochen",
    koerper:
      "Zwei Wochen Fasten bedeuten eine tiefe Entlastung für Verdauung und Stoffwechsel. Blutzucker, Insulin und bei vielen auch der Blutdruck liegen niedrig. Der Körper ist ganz auf Selbstversorgung eingestellt – aufs Essen muss er sich erst wieder umstellen.",
    gefuehl:
      "Viele fühlen sich jetzt leicht und klar, aber körperlich schnell erschöpft.",
    wichtig: [
      "Ist heute dein letzter Fastentag: morgen mittags mit einem Apfel fasten brechen, jeden Bissen gut kauen",
      "Danach langsam aufbauen, etwa ein Drittel der Fastentage lang, mit kleinen, leichten Mahlzeiten",
      "Das Training erst nach dem Aufbau vorsichtig wieder aufnehmen",
    ],
  },
  {
    tag: 15,
    titel: "Die lange Strecke",
    koerper:
      "Du fastest jetzt länger, als es für das Fasten zu Hause meist empfohlen wird. Die Reserven tragen weiter, aber Salze und Mineralstoffe werden wichtiger, weil der Körper sie laufend verliert.",
    gefuehl:
      "Der Alltag verlangsamt sich. Die Konzentration kann schwanken, Kälte wird deutlicher.",
    wichtig: [
      "Die tägliche Brühe ist jetzt besonders wichtig",
      "Ab hier ist ärztliche Begleitung mit Blutwerten (Salze, Harnsäure) empfohlen",
      "Nur sanfte Bewegung",
    ],
  },
  {
    tag: 16,
    titel: "Achtsam bleiben",
    koerper:
      "Der Körper spart Energie, wo er kann: Herzschlag und Körpertemperatur können etwas sinken. Das Muskeleiweiß wird weiter geschont, solange genug Fettreserven da sind.",
    gefuehl:
      "Ruhe tut jetzt gut, zu viel Aktivität strengt schnell an.",
    wichtig: [
      "Warnzeichen ernst nehmen: Herzstolpern, starke Schwäche, Verwirrtheit",
      "Viel Schlaf und Ruhephasen",
      "Kurze Spaziergänge statt langer Touren",
    ],
  },
  {
    tag: 17,
    titel: "Innere Ruhe",
    koerper:
      "Stoffwechsel und Hormone sind stabil im Fastenmodus. Die Nieren arbeiten weiter an der Ausscheidung, deshalb bleibt die Trinkmenge wichtig.",
    gefuehl:
      "Viele erleben diese Tage als still und klar. Gedanken haben mehr Raum.",
    wichtig: [
      "2,5–3 Liter trinken, nicht weniger",
      "Sanftes Yoga und Atemübungen",
      "Bei Schwäche ½ TL Honig in den Tee",
    ],
  },
  {
    tag: 18,
    titel: "Gut haushalten",
    koerper:
      "Die Fettreserven nehmen weiter ab, etwa zwei- bis dreihundert Gramm am Tag. Wer schlank ins Fasten gegangen ist, kommt jetzt an die Grenze dessen, was sinnvoll ist.",
    gefuehl:
      "Lassen Kraft und Wohlbefinden deutlich nach, ist das ein Signal, das Fasten zu beenden.",
    wichtig: [
      "Ehrlich prüfen: Tut das Fasten noch gut?",
      "Fastenbrechen ist jederzeit möglich – mit einem Apfel und langsamem Aufbau",
      "Ruhe und Wärme",
    ],
  },
  {
    tag: 19,
    titel: "Den Aufbau planen",
    koerper:
      "Nach so langer Pause brauchen Magen und Darm Zeit, um wieder Verdauungssäfte zu bilden. Der Aufbau nach dem Fasten ist darum genauso wichtig wie das Fasten selbst.",
    gefuehl:
      "Vorfreude aufs Essen ist normal. Plane sie in Ruhe.",
    wichtig: [
      "Aufbaukost einkaufen: Äpfel, Kartoffeln, Gemüse, Haferflocken",
      "Den Aufbau etwa ein Drittel der Fastentage lang planen",
      "Weiter trinken und sanft bewegen",
    ],
  },
  {
    tag: 20,
    titel: "Fast drei Wochen",
    koerper:
      "Dein Körper ist seit fast drei Wochen im Fastenstoffwechsel. Salze und Harnsäure im Blut sollten spätestens jetzt ärztlich geprüft sein.",
    gefuehl:
      "Oft sehr ruhig, teils erschöpft. Hör genau auf dich.",
    wichtig: [
      "Ärztliche Kontrolle, falls noch nicht geschehen",
      "Keine Anstrengung, viel Ruhe",
      "Tee und Brühe zu festen Zeiten",
    ],
  },
  {
    tag: 21,
    titel: "Drei Wochen und mehr",
    koerper:
      "Drei Wochen Fasten sind eine lange Zeit. Der Körper lebt vollständig von seinen Reserven und hat sich so weit wie möglich darauf eingestellt.",
    gefuehl:
      "Das Ende sollte jetzt in Sicht sein. Weiterfasten nur mit ärztlicher Begleitung.",
    wichtig: [
      "Fasten über drei Wochen hinaus nur unter ärztlicher Aufsicht",
      "Fastenbrechen mit einem Apfel, danach etwa eine Woche Aufbau",
      "Das Training erst nach dem Aufbau langsam steigern",
    ],
  },
];
