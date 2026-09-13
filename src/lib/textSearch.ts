// Textvergleich fuer Suchfelder. Domaenenfrei: bekommt zwei Zeichenketten und
// sagt, ob die eine in der anderen steckt – unabhaengig von Gross-/Klein-
// schreibung und von der Umlaut-Schreibweise.
//
// Umlaute schreibt man in der App mal so ("Rücken"), getippt wird mal so
// ("ruecken") und mal so ("rucken"). Eine einzige Normalform kann nicht beide
// Tippweisen treffen: expandiert man ue, verliert man "rucken"; laesst man die
// Punkte weg, verliert man "ruecken". Deshalb werden beide Formen gebildet und
// paarweise verglichen – passt eine, ist es ein Treffer.

// Kleinschreibung plus deutsche Umlaute in ihrer ausgeschriebenen Form.
function expanded(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// Kleinschreibung ohne diakritische Zeichen (ü -> u, é -> e). ß bleibt stehen,
// dafuer sorgt die expandierte Form.
function folded(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Steckt der Suchbegriff im Text? Leerer (oder nur aus Leerzeichen
// bestehender) Begriff passt immer – die Liste bleibt dann vollstaendig.
export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim();
  if (q.length === 0) return true;
  return (
    expanded(text).includes(expanded(q)) || folded(text).includes(folded(q))
  );
}
