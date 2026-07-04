const fs = require("fs");
const data = JSON.parse(fs.readFileSync(__dirname + "/pieces-additions.json", "utf8"));
const DUR = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25 };
const KEY_RE = /^[A-G](#|b)?[0-8]$/;
const errors = [];

const EXISTING_IDS = [
  "hot-cross-buns","mary-had-a-little-lamb","twinkle-twinkle","ode-to-joy",
  "jingle-bells","when-the-saints","amazing-grace","yankee-doodle","frere-jacques",
  "happy-birthday","minuet-in-g","greensleeves","fur-elise","oh-susanna",
  "bach-prelude-in-c","canon-in-d","gymnopedie-no-1","moonlight-sonata",
  "chopin-prelude-e-minor"
];

function beats(n) {
  const base = DUR[n.d];
  if (base === undefined) return NaN;
  return n.dots === 1 ? base * 1.5 : base;
}

function measureTotal(ts) {
  const [num, den] = ts.split("/").map(Number);
  return (num * 4) / den;
}

const seen = new Set();
for (const p of data.pieces) {
  for (const f of ["id","title","composer","year","level","keySignature","timeSignature","tempo","description","skills","teachingTips","measures"]) {
    if (p[f] === undefined) errors.push(`${p.id ?? "?"}: missing field ${f}`);
  }
  if (EXISTING_IDS.includes(p.id)) errors.push(`${p.id}: id collides with an existing piece`);
  if (seen.has(p.id)) errors.push(`${p.id}: duplicate id within additions`);
  seen.add(p.id);
  const total = measureTotal(p.timeSignature);
  p.measures.forEach((m, i) => {
    for (const hand of ["rh", "lh"]) {
      if (!Array.isArray(m[hand])) { errors.push(`${p.id} m${i + 1}: ${hand} missing`); continue; }
      let sum = 0;
      for (const n of m[hand]) {
        const b = beats(n);
        if (Number.isNaN(b)) errors.push(`${p.id} m${i + 1} ${hand}: bad duration ${n.d}`);
        else sum += b;
        if (!n.rest) {
          if (!n.keys || !n.keys.length) errors.push(`${p.id} m${i + 1} ${hand}: note without keys`);
          else for (const k of n.keys) if (!KEY_RE.test(k)) errors.push(`${p.id} m${i + 1} ${hand}: bad key ${k}`);
        }
      }
      if (Math.abs(sum - total) > 0.001) {
        errors.push(`${p.id} m${i + 1} ${hand}: sums to ${sum}, expected ${total}`);
      }
    }
  });
}

const lowLevel = data.pieces.filter((p) => p.level <= 2).length;
if (data.pieces.length < 6) errors.push(`only ${data.pieces.length} pieces, need >= 6`);
if (lowLevel < 2) errors.push(`only ${lowLevel} level<=2 pieces, need >= 2`);

if (errors.length) {
  console.log(errors.join("\n"));
  console.log(`\n${errors.length} error(s)`);
  process.exit(1);
} else {
  console.log(`OK: ${data.pieces.length} pieces, ${lowLevel} at level <= 2, all measures sum correctly`);
  const byLevel = {};
  for (const p of data.pieces) byLevel[p.level] = (byLevel[p.level] ?? 0) + 1;
  console.log("by level:", JSON.stringify(byLevel));
}
