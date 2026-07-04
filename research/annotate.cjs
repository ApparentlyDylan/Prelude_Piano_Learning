const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "../src/data/pieces.json");
const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const before = JSON.stringify(data);

// opening dynamic + opening RH fingering per piece
const openings = {
  "hot-cross-buns":        { dyn: "mf", f: 3 },
  "mary-had-a-little-lamb":{ dyn: "mf", f: 3 },
  "twinkle-twinkle":       { dyn: "mp", f: 1 },
  "ode-to-joy":            { dyn: "mf", f: 3 },
  "jingle-bells":          { dyn: "f",  f: 3 },
  "when-the-saints":       { dyn: "f",  f: 1 },
  "amazing-grace":         { dyn: "mf", f: 1 },
  "yankee-doodle":         { dyn: "f",  f: 3 },
  "frere-jacques":         { dyn: "mf", f: 1 },
  "happy-birthday":        { dyn: "mf", f: 1 },
  "minuet-in-g":           { dyn: "mf", f: 5 },
  "greensleeves":          { dyn: "p",  f: 1 },
  "fur-elise":             { dyn: "p",  f: 4 },
  "oh-susanna":            { dyn: "mf", f: 1 },
  "bach-prelude-in-c":     { dyn: "mp", f: 1 },
  "canon-in-d":            { dyn: "mp", f: 5 },
  "gymnopedie-no-1":       { dyn: "pp", f: 3 },
  "moonlight-sonata":      { dyn: "pp", f: 1 },
  "chopin-prelude-e-minor":{ dyn: "p",  f: 5 },
  "row-row-your-boat":     { dyn: "mp", f: 1 },
  "london-bridge":         { dyn: "mf", f: 4 },
  "lightly-row":           { dyn: "mp", f: 5 },
  "auld-lang-syne":        { dyn: "mf", f: 1 },
  "mountain-king":         { dyn: "pp", f: 1 },
  "morning-mood":          { dyn: "p",  f: 4 },
  "habanera-carmen":       { dyn: "mf", f: 5 },
};

// extra marks: [pieceId, hand, measureIdx, noteIdx, expectKeys, field, value]
const extras = [
  ["twinkle-twinkle", "rh", 0, 2, "G4", "f", 4],
  ["amazing-grace", "rh", 7, 0, "D5", "f", 5],
  ["amazing-grace", "rh", 7, 0, "D5", "tie", true],
  ["happy-birthday", "rh", 5, 0, "G4", "f", 5],
  ["minuet-in-g", "rh", 2, 0, "E5", "f", 5],
  ["minuet-in-g", "rh", 2, 1, "C5", "f", 1],
  ["ode-to-joy", "rh", 4, 0, "E4", "dyn", "f"],
  ["mountain-king", "rh", 7, 0, null, "dyn", "f"],
  ["gymnopedie-no-1", "rh", 5, 0, "F#4", "tie", true],
  ["gymnopedie-no-1", "rh", 10, 0, "F#4", "tie", true],
];
// moonlight LH: held whole-measure octaves — tie first chord to second where identical
for (const mi of [0, 1, 3, 4, 5, 6, 7]) {
  extras.push(["moonlight-sonata", "lh", mi, 0, null, "tie", true]);
}

const errors = [];
for (const p of data.pieces) {
  const open = openings[p.id];
  if (!open) { errors.push(`no opening spec for ${p.id}`); continue; }
  const firstNote = p.measures.flatMap((m) => m.rh).find((n) => !n.rest);
  if (!firstNote) { errors.push(`${p.id}: no RH notes`); continue; }
  firstNote.dyn = open.dyn;
  firstNote.f = open.f;
}

for (const [id, hand, mi, ni, expect, field, value] of extras) {
  const p = data.pieces.find((x) => x.id === id);
  const note = p?.measures[mi]?.[hand]?.[ni];
  if (!note || note.rest) { errors.push(`extra target missing: ${id} ${hand} m${mi} n${ni}`); continue; }
  if (expect && note.keys.join("+") !== expect) {
    errors.push(`extra key mismatch: ${id} ${hand} m${mi} n${ni} is ${note.keys.join("+")}, expected ${expect}`);
    continue;
  }
  if (field === "tie") {
    const next = p.measures[mi][hand][ni + 1] ?? p.measures[mi + 1]?.[hand]?.[0];
    if (!next || next.rest || next.keys.join() !== note.keys.join()) {
      errors.push(`tie invalid: ${id} ${hand} m${mi} n${ni} — next note differs`);
      continue;
    }
  }
  note[field] = value;
}

// verify: melodies unchanged after stripping annotations, beat sums intact
const DUR = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25 };
const total = (ts) => { const [a, b] = ts.split("/").map(Number); return (a * 4) / b; };
const stripFields = (obj) => JSON.parse(JSON.stringify(obj), (k, v) =>
  k === "f" || k === "dyn" || k === "tie" ? undefined : v);
if (JSON.stringify(stripFields(JSON.parse(before))) !== JSON.stringify(stripFields(data))) {
  errors.push("melody data changed!");
}
for (const p of data.pieces) {
  const t = total(p.timeSignature);
  p.measures.forEach((m, i) => {
    for (const hand of ["rh", "lh"]) {
      const sum = m[hand].reduce((a, n) => a + (DUR[n.d] ?? NaN) * (n.dots === 1 ? 1.5 : 1), 0);
      if (Math.abs(sum - t) > 0.001) errors.push(`${p.id} m${i + 1} ${hand}: beat sum broken`);
    }
  });
  const rhAll = p.measures.flatMap((m) => m.rh);
  if (!rhAll.some((n) => n.dyn)) errors.push(`${p.id}: no dyn`);
  if (!rhAll.some((n) => n.f)) errors.push(`${p.id}: no fingering`);
}

if (errors.length) {
  console.log(errors.join("\n"));
  process.exit(1);
}
fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
let f = 0, dyn = 0, tie = 0;
for (const p of data.pieces) for (const m of p.measures) for (const h of ["rh", "lh"])
  for (const n of m[h]) { if (n.f) f++; if (n.dyn) dyn++; if (n.tie) tie++; }
console.log(`annotated: f=${f} dyn=${dyn} tie=${tie} across ${data.pieces.length} pieces`);
