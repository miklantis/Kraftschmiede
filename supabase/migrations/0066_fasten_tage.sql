-- 0066 Tagestexte des Fastenbegleiters
-- ----------------------------------------------------------------
-- Vorhaben #503.
--
-- Was: Eine neue Tabelle `fasten_tage` haelt je Fastentag (1 bis 21) einen
-- vorgefertigten Begleittext nach der Buchinger-Methode: Titel, was im Koerper
-- passiert, wie man sich fuehlen kann, und was heute wichtig ist (Stichpunkte).
--
-- Warum: Liegt heute in einem Zeitraum vom Typ „Heilfasten“, zeigt die
-- Trainingsseite statt Empfehlung und Skills den Fastenbegleiter mit dem Text
-- des Tages. Die Texte liegen wie Uebungen und Skills als Definitionen in der
-- Datenbank (ADR-0002), damit sie spaeter je Konto aenderbar sind.
--
-- Fuer wen: jedes Konto bekommt die 21 Texte. Bestandskonten ueber diese
-- Migration, neue Konten ueber den Seed beim App-Start (nachziehend je Tag).
-- Laeuft ein Fasten laenger als 21 Tage, zeigt die App den Text von Tag 21.
--
-- Ein Tag kommt je Nutzer nur einmal vor. RLS und Grants wie bei allen
-- Tabellen (strikt auf die eigene user_id). Idempotent (create if not exists,
-- drop policy if exists, on conflict do nothing) – ein zweiter Lauf legt nichts
-- doppelt an und ueberschreibt keine geaenderten Texte.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.fasten_tage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag        integer not null check (tag >= 1),
  titel      text not null,
  koerper    text not null,
  gefuehl    text not null,
  wichtig    text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint fasten_tage_user_tag_key unique (user_id, tag)
);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.fasten_tage enable row level security;

drop policy if exists "fasten_tage_select_own" on public.fasten_tage;
create policy "fasten_tage_select_own" on public.fasten_tage
  for select using (auth.uid() = user_id);

drop policy if exists "fasten_tage_insert_own" on public.fasten_tage;
create policy "fasten_tage_insert_own" on public.fasten_tage
  for insert with check (auth.uid() = user_id);

drop policy if exists "fasten_tage_update_own" on public.fasten_tage;
create policy "fasten_tage_update_own" on public.fasten_tage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fasten_tage_delete_own" on public.fasten_tage;
create policy "fasten_tage_delete_own" on public.fasten_tage
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.fasten_tage to authenticated;

-- 3. Texte fuer alle bestehenden Konten (gleicher Wortlaut wie der Seed in
--    src/seed/fastenTage.ts; ein Test prueft den Gleichlauf). Vorhandene Tage
--    bleiben unangetastet.
insert into public.fasten_tage (user_id, tag, titel, koerper, gefuehl, wichtig)
select u.id, t.tag, t.titel, t.koerper, t.gefuehl, t.wichtig
  from auth.users u
 cross join (values
  (1, 'Der Einstieg',
   'Dein Körper lebt heute noch von den Vorräten der letzten Mahlzeiten. Die Zuckerspeicher der Leber reichen etwa einen Tag, danach beginnt die Umstellung auf die Reserven. Klassisch nach Buchinger wird heute der Darm entleert, damit das Hungergefühl schneller nachlässt.',
   'Hunger meldet sich vor allem zu den gewohnten Essenszeiten – das ist Gewohnheit, kein echter Mangel. Manche sind unruhig oder gereizt.',
   array['Über den Tag 2,5–3 Liter Wasser und Kräutertee trinken',
         'Mittags die Gemüsebrühe langsam und bewusst löffeln',
         'Wenn du nach Buchinger entleerst: Glaubersalz am Morgen, danach viel trinken',
         'Den Tag ruhig planen, kein Training']),
  (2, 'Die Umstellung läuft',
   'Die Zuckerspeicher sind weitgehend leer. Um das Gehirn zu versorgen, bildet die Leber jetzt Zucker aus Eiweiß und Fett, und die Fettverbrennung zieht an. Mit dem Zucker verliert der Körper viel gebundenes Wasser – die Waage fällt deshalb anfangs schnell.',
   'Kopfschmerzen, Frieren und Müdigkeit sind heute häufig, oft auch als Entzug von Kaffee und Zucker. Der Kreislauf kann träge sein.',
   array['Viel trinken hilft gegen Kopfschmerzen',
         'Langsam aufstehen, besonders morgens und nach dem Liegen',
         'Warm anziehen, eine Wärmflasche tut gut',
         'Kurzer Spaziergang an der frischen Luft']),
  (3, 'Durchhalten lohnt sich',
   'Die Leber bildet aus Fett zunehmend Ketonkörper, die Ketose setzt ein. Sie werden zum zweiten Brennstoff, auch für das Gehirn. Zungenbelag und Mundgeruch zeigen, dass der Stoffwechsel umschaltet.',
   'Für viele ist heute der härteste Tag: Hunger, schlechte Laune, wenig Antrieb – die klassische Fastenkrise. Sie geht vorbei, meist schon morgen.',
   array['Zunge morgens reinigen, öfter Zähne putzen',
         'Bei Schwäche ½ TL Honig in den Tee',
         'Ablenkung suchen: Spaziergang, Lesen, früh ins Bett',
         'Wenn du nach Buchinger entleerst: ab heute etwa alle zwei Tage (Einlauf oder Bittersalz)']),
  (4, 'Der Hunger wird leiser',
   'Deine Kohlenhydratspeicher sind aufgebraucht. Die Leber baut jetzt Fett zu Ketonkörpern um, und dein Gehirn gewinnt einen immer größeren Teil seiner Energie daraus. Die Umstellung auf den Fastenstoffwechsel ist weitgehend geschafft.',
   'Bei vielen lässt der Hunger heute nach und die Energie kommt zurück. Kopfschmerzen der ersten Tage klingen meist ab. Beim schnellen Aufstehen kann es noch kurz schwindeln.',
   array['2,5–3 Liter Wasser und Kräutertee',
         'Mittags die Gemüsebrühe langsam löffeln',
         'Spaziergang oder Yoga statt Training',
         'Langsam aufstehen']),
  (5, 'Leichtigkeit',
   'Der Fastenstoffwechsel läuft. Fett ist jetzt der Hauptbrennstoff, und weil das Gehirn viel Energie aus Ketonkörpern bezieht, muss der Körper weniger Eiweiß zu Zucker umbauen. Die Gewichtsabnahme wird langsamer: Das schnelle Wasser ist weg, jetzt geht es an die Reserven.',
   'Viele erleben um diese Tage ein Stimmungshoch: klarer Kopf, Leichtigkeit, gute Laune. Genieß es, aber übernimm dich nicht.',
   array['Die Energie für Bewegung nutzen: längerer Spaziergang oder Yoga',
         'Trotz guter Form kein Krafttraining',
         'Mittagsruhe einplanen, klassisch mit warmem Leberwickel',
         'Weiter reichlich trinken']),
  (6, 'Im Rhythmus',
   'Dein Körper hat sich auf die Selbstversorgung eingestellt. Blutzucker und Insulin bleiben niedrig und gleichmäßig, das erleichtert die Fettverbrennung. Der Darm ruht weitgehend.',
   'Der Tag fühlt sich oft ruhig und gleichmäßig an. Der Schlaf kann leichter oder kürzer sein, ohne dass du tagsüber müde bist.',
   array['Feste Zeiten für Tee und Brühe geben dem Tag Struktur',
         'Abends zur Ruhe kommen: warmes Fußbad, Tee, früh ins Bett',
         'Bewegung an der frischen Luft']),
  (7, 'Eine Woche geschafft',
   'Nach einer Woche hat dein Körper etwa ein bis zwei Kilo Fett verbraucht, dazu Wasser. Blutdruck und Blutzucker sinken bei vielen in dieser Phase. Die Haut kann vorübergehend unreiner oder trockener werden.',
   'Stolz ist angebracht. Manchmal tauchen jetzt Gedanken und Gefühle auf, die im Alltag keinen Platz hatten – auch das gehört zum Fasten.',
   array['Zwischenbilanz ziehen: Wie geht es dir, was tut dir gut?',
         'Haut pflegen, warm statt heiß duschen',
         'Weiter Spaziergang oder Yoga',
         'Langsam aufstehen, der Blutdruck ist oft niedriger']),
  (8, 'Die zweite Woche',
   'Fett liefert jetzt den größten Teil deiner Energie, Ketonkörper versorgen das Gehirn zu einem guten Teil. Der Körper schont dabei sein Muskeleiweiß, so gut er kann – Bewegung gibt ihm das Signal, die Muskeln zu erhalten.',
   'Das Fasten wird Routine. An manchen Tagen fehlt der Antrieb, an anderen fühlst du dich erstaunlich wach.',
   array['Täglich bewegen: Spaziergang oder Yoga erhalten die Muskeln',
         'Die Brühe nicht auslassen, sie liefert Salz und Mineralstoffe',
         'Fachleute raten, länger als etwa eine Woche nur mit ärztlicher Begleitung zu fasten – eine kurze Rücksprache gibt Sicherheit']),
  (9, 'Ruhige Tiefe',
   'Dein Stoffwechsel läuft sparsam: Der Grundumsatz sinkt etwas, der Körper haushaltet mit seiner Energie. Entzündungswerte können sinken, bei manchen lassen Gelenk- oder Hautbeschwerden nach.',
   'Häufig spürbar: Kälteempfinden, langsamere Bewegungen, ein ruhiges, nach innen gewandtes Gefühl.',
   array['Warm halten: Socken, Decke, Wärmflasche',
         'Mittagsruhe, klassisch mit Leberwickel',
         'Sanftes Yoga statt fordernder Einheiten',
         'Wenn du nach Buchinger entleerst: weiter etwa alle zwei Tage']),
  (10, 'Zehn Tage',
   'Die Fettreserven tragen dich zuverlässig. Der Harnsäurespiegel kann beim Fasten ansteigen, weil Ketonkörper und Harnsäure über die Nieren um die Ausscheidung konkurrieren – reichlich trinken hilft.',
   'Viele erleben um den zehnten Tag noch einmal einen Durchhänger. Das ist kein Zeichen, dass etwas schiefläuft.',
   array['Die Trinkmenge halten: 2,5–3 Liter',
         'Gelenkschmerzen, besonders im großen Zeh, ärztlich abklären lassen (Harnsäure)',
         'Ein Spaziergang in der Sonne hebt die Stimmung']),
  (11, 'Gelassenheit',
   'Der Körper ist tief im Fastenstoffwechsel. Die Verdauungsorgane ruhen, die Darmflora stellt sich auf die veränderte Lage ein. Der Blutdruck bleibt oft niedriger als sonst.',
   'Hunger spielt kaum noch eine Rolle. Essensgerüche können dich trotzdem stark anziehen – das ist normal.',
   array['Kochen und Essensgerüche möglichst meiden',
         'Bewusst Pausen machen, Ruhe gehört zum Fasten',
         'Langsam aufstehen, Treppen gemächlich nehmen',
         'Tee und Brühe zu festen Zeiten']),
  (12, 'Kraft einteilen',
   'Die Muskeln wirken flacher, weil ihnen Glykogen und Wasser fehlen. Ein Teil davon ist kein echter Muskelverlust und kommt nach dem Fasten schnell zurück. Leichte Bewegung hält die Muskulatur aktiv.',
   'Kraft und Ausdauer sind spürbar geringer, der Kopf bleibt oft klar. Wadenkrämpfe können auf fehlende Mineralstoffe hinweisen.',
   array['Yoga oder Dehnen für die Beweglichkeit',
         'Die Brühe ruhig kräftig salzen',
         'Bei häufigen Krämpfen ärztlich klären, ob Magnesium sinnvoll ist',
         'Nichts Schweres heben']),
  (13, 'Vorausdenken',
   'Dein Körper zehrt ruhig von seinen Reserven. Die Leber bildet weiter Ketonkörper, der Wasserhaushalt hat sich eingependelt.',
   'Oft wächst jetzt die Vorfreude aufs Essen – oder der Wunsch, noch weiterzumachen. Beides ist in Ordnung.',
   array['Endet dein Fasten bald: das Fastenbrechen vorbereiten – Äpfel, Kartoffeln und Gemüse einkaufen',
         'Die ersten Tage danach bewusst leicht planen',
         'Weiter täglich Spaziergang oder Yoga']),
  (14, 'Zwei Wochen',
   'Zwei Wochen Fasten bedeuten eine tiefe Entlastung für Verdauung und Stoffwechsel. Blutzucker, Insulin und bei vielen auch der Blutdruck liegen niedrig. Der Körper ist ganz auf Selbstversorgung eingestellt – aufs Essen muss er sich erst wieder umstellen.',
   'Viele fühlen sich jetzt leicht und klar, aber körperlich schnell erschöpft.',
   array['Ist heute dein letzter Fastentag: morgen mittags mit einem Apfel fasten brechen, jeden Bissen gut kauen',
         'Danach langsam aufbauen, etwa ein Drittel der Fastentage lang, mit kleinen, leichten Mahlzeiten',
         'Das Training erst nach dem Aufbau vorsichtig wieder aufnehmen']),
  (15, 'Die lange Strecke',
   'Du fastest jetzt länger, als es für das Fasten zu Hause meist empfohlen wird. Die Reserven tragen weiter, aber Salze und Mineralstoffe werden wichtiger, weil der Körper sie laufend verliert.',
   'Der Alltag verlangsamt sich. Die Konzentration kann schwanken, Kälte wird deutlicher.',
   array['Die tägliche Brühe ist jetzt besonders wichtig',
         'Ab hier ist ärztliche Begleitung mit Blutwerten (Salze, Harnsäure) empfohlen',
         'Nur sanfte Bewegung']),
  (16, 'Achtsam bleiben',
   'Der Körper spart Energie, wo er kann: Herzschlag und Körpertemperatur können etwas sinken. Das Muskeleiweiß wird weiter geschont, solange genug Fettreserven da sind.',
   'Ruhe tut jetzt gut, zu viel Aktivität strengt schnell an.',
   array['Warnzeichen ernst nehmen: Herzstolpern, starke Schwäche, Verwirrtheit',
         'Viel Schlaf und Ruhephasen',
         'Kurze Spaziergänge statt langer Touren']),
  (17, 'Innere Ruhe',
   'Stoffwechsel und Hormone sind stabil im Fastenmodus. Die Nieren arbeiten weiter an der Ausscheidung, deshalb bleibt die Trinkmenge wichtig.',
   'Viele erleben diese Tage als still und klar. Gedanken haben mehr Raum.',
   array['2,5–3 Liter trinken, nicht weniger',
         'Sanftes Yoga und Atemübungen',
         'Bei Schwäche ½ TL Honig in den Tee']),
  (18, 'Gut haushalten',
   'Die Fettreserven nehmen weiter ab, etwa zwei- bis dreihundert Gramm am Tag. Wer schlank ins Fasten gegangen ist, kommt jetzt an die Grenze dessen, was sinnvoll ist.',
   'Lassen Kraft und Wohlbefinden deutlich nach, ist das ein Signal, das Fasten zu beenden.',
   array['Ehrlich prüfen: Tut das Fasten noch gut?',
         'Fastenbrechen ist jederzeit möglich – mit einem Apfel und langsamem Aufbau',
         'Ruhe und Wärme']),
  (19, 'Den Aufbau planen',
   'Nach so langer Pause brauchen Magen und Darm Zeit, um wieder Verdauungssäfte zu bilden. Der Aufbau nach dem Fasten ist darum genauso wichtig wie das Fasten selbst.',
   'Vorfreude aufs Essen ist normal. Plane sie in Ruhe.',
   array['Aufbaukost einkaufen: Äpfel, Kartoffeln, Gemüse, Haferflocken',
         'Den Aufbau etwa ein Drittel der Fastentage lang planen',
         'Weiter trinken und sanft bewegen']),
  (20, 'Fast drei Wochen',
   'Dein Körper ist seit fast drei Wochen im Fastenstoffwechsel. Salze und Harnsäure im Blut sollten spätestens jetzt ärztlich geprüft sein.',
   'Oft sehr ruhig, teils erschöpft. Hör genau auf dich.',
   array['Ärztliche Kontrolle, falls noch nicht geschehen',
         'Keine Anstrengung, viel Ruhe',
         'Tee und Brühe zu festen Zeiten']),
  (21, 'Drei Wochen und mehr',
   'Drei Wochen Fasten sind eine lange Zeit. Der Körper lebt vollständig von seinen Reserven und hat sich so weit wie möglich darauf eingestellt.',
   'Das Ende sollte jetzt in Sicht sein. Weiterfasten nur mit ärztlicher Begleitung.',
   array['Fasten über drei Wochen hinaus nur unter ärztlicher Aufsicht',
         'Fastenbrechen mit einem Apfel, danach etwa eine Woche Aufbau',
         'Das Training erst nach dem Aufbau langsam steigern'])
 ) as t(tag, titel, koerper, gefuehl, wichtig)
on conflict (user_id, tag) do nothing;
