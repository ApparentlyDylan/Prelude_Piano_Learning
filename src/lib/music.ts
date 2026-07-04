import type { Measure, NoteEvent, Piece } from "./types";

const LETTER_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const DURATION_BEATS: Record<string, number> = {
  w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25,
};

export function noteBeats(n: NoteEvent): number {
  const base = DURATION_BEATS[n.d] ?? 1;
  return n.dots === 1 ? base * 1.5 : base;
}

export function measureBeats(ts: string): number {
  const [num, den] = ts.split("/").map(Number);
  return (num * 4) / den;
}

/** "F#4" -> MIDI number (C4 = 60). */
export function nameToMidi(name: string): number {
  const m = name.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d)$/);
  if (!m) return 60;
  const [, letter, acc, oct] = m;
  let semis = LETTER_SEMITONES[letter];
  if (acc) semis += acc[0] === "#" ? acc.length : -acc.length;
  return (Number(oct) + 1) * 12 + semis;
}

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiToName(midi: number): string {
  const oct = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${oct}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

/** "F#4" -> "f#/4" for VexFlow. */
export function toVexKey(name: string): string {
  const m = name.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d)$/);
  if (!m) return "c/4";
  const [, letter, acc, oct] = m;
  return `${letter.toLowerCase()}${acc ?? ""}/${oct}`;
}

export interface FlatNote {
  /** flat index across the whole piece, rests included */
  index: number;
  measureIndex: number;
  noteIndex: number;
  keys: string[];
  midi: number[];
  isRest: boolean;
  /** continuation of a tie chain — sounds with the previous note, not re-struck */
  isTieCont: boolean;
  startBeats: number;
  beats: number;
  /** beats to sound when struck (tie chains summed onto the first note, 0 on continuations) */
  playBeats: number;
}

/** Flatten one hand of a piece into a timed sequence, resolving ties. */
export function flattenHand(measures: Measure[], hand: "rh" | "lh"): FlatNote[] {
  const out: FlatNote[] = [];
  let index = 0;
  let start = 0;
  let prevTied = false;
  let prevKeys = "";
  measures.forEach((measure, measureIndex) => {
    measure[hand].forEach((n, noteIndex) => {
      const beats = noteBeats(n);
      const keys = n.keys ?? [];
      const isRest = !!n.rest || !keys.length;
      const isTieCont = !isRest && prevTied && keys.join() === prevKeys;
      out.push({
        index,
        measureIndex,
        noteIndex,
        keys,
        midi: keys.map(nameToMidi),
        isRest,
        isTieCont,
        startBeats: start,
        beats,
        playBeats: isTieCont ? 0 : beats,
      });
      prevTied = !isRest && !!n.tie;
      prevKeys = keys.join();
      index += 1;
      start += beats;
    });
  });
  // roll continuation durations back onto the struck note of each chain
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].isTieCont) {
      let j = i - 1;
      while (j >= 0 && out[j].isTieCont) j -= 1;
      if (j >= 0 && !out[j].isRest) out[j].playBeats += out[i].beats;
    }
  }
  return out;
}

export function pieceDurationBeats(piece: Piece): number {
  return piece.measures.length * measureBeats(piece.timeSignature);
}

export const LEVEL_NAMES: Record<number, string> = {
  1: "First Steps",
  2: "Early Beginner",
  3: "Late Beginner",
  4: "Early Intermediate",
  5: "Intermediate",
};
