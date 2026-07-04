const fs = require("fs");
const path = require("path");

const R = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8"));
const DUR = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25 };
const KEY_RE = /^[A-G](#|b)?[0-8]$/;
const beats = (n) => (DUR[n.d] ?? NaN) * (n.dots === 1 ? 1.5 : 1);
const total = (ts) => { const [a, b] = ts.split("/").map(Number); return (a * 4) / b; };

// ---- curriculum ----
const curriculum = R("curriculum.json");
if (fs.existsSync(path.join(__dirname, "curriculum-additions.json"))) {
  const add = R("curriculum-additions.json");
  const ids = new Set();
  for (const t of curriculum.tracks) for (const m of t.modules) {
    ids.add(m.id);
    for (const l of m.lessons) ids.add(l.id);
  }
  for (const trackId of ["beginner", "intermediate"]) {
    const track = curriculum.tracks.find((t) => t.id === trackId);
    for (const mod of add[trackId] ?? []) {
      if (ids.has(mod.id)) throw new Error(`duplicate module id ${mod.id}`);
      for (const l of mod.lessons) {
        if (ids.has(l.id)) throw new Error(`duplicate lesson id ${l.id}`);
        if (!l.sections?.length) throw new Error(`lesson ${l.id} has no sections`);
      }
      track.modules.push(mod);
    }
  }
  let lessons = 0;
  for (const t of curriculum.tracks) for (const m of t.modules) lessons += m.lessons.length;
  fs.writeFileSync(path.join(__dirname, "../src/data/curriculum.json"), JSON.stringify(curriculum, null, 2));
  console.log(`curriculum merged: ${lessons} lessons total`);
} else {
  console.log("curriculum-additions.json not present, skipped");
}

// ---- pieces ----
const pieces = R("pieces.json");
if (fs.existsSync(path.join(__dirname, "pieces-additions.json"))) {
  const add = R("pieces-additions.json");
  const ids = new Set(pieces.pieces.map((p) => p.id));
  const errors = [];
  for (const p of add.pieces) {
    if (ids.has(p.id)) errors.push(`duplicate piece id ${p.id}`);
    const t = total(p.timeSignature);
    p.measures.forEach((m, i) => {
      for (const hand of ["rh", "lh"]) {
        let sum = 0;
        for (const n of m[hand] ?? []) {
          sum += beats(n);
          if (!n.rest) for (const k of n.keys ?? []) if (!KEY_RE.test(k)) errors.push(`${p.id} m${i + 1}: bad key ${k}`);
        }
        if (Math.abs(sum - t) > 0.001) errors.push(`${p.id} m${i + 1} ${hand}: sums ${sum}, expected ${t}`);
      }
    });
  }
  if (errors.length) {
    console.log(errors.join("\n"));
    process.exit(1);
  }
  const merged = { pieces: [...pieces.pieces, ...add.pieces] };
  fs.writeFileSync(path.join(__dirname, "../src/data/pieces.json"), JSON.stringify(merged, null, 2));
  const byLevel = {};
  for (const p of merged.pieces) byLevel[p.level] = (byLevel[p.level] ?? 0) + 1;
  console.log(`pieces merged: ${merged.pieces.length} total, by level ${JSON.stringify(byLevel)}`);
} else {
  console.log("pieces-additions.json not present, skipped");
}
