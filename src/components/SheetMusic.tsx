import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accidental, Annotation, Beam, Dot, Formatter, Renderer, Stave, StaveConnector,
  StaveNote, StaveTie, Voice,
} from "vexflow";
import type { Measure, NoteEvent } from "../lib/types";
import { measureBeats, toVexKey } from "../lib/music";

const COLOR_CURRENT = "#9a6b3f";
const COLOR_DONE = "#a9a294";

export interface HandHighlight {
  rh?: number;
  lh?: number;
}

interface SheetMusicProps {
  measures: Measure[];
  keySignature: string;
  timeSignature: string;
  /** flat note indices (rests included) to highlight, per hand */
  highlight?: HandHighlight;
  showLeftHand?: boolean;
}

interface System {
  startMeasure: number;
  measures: Measure[];
  widths: number[];
}

function naturalWidth(m: Measure): number {
  const n = Math.max(m.rh.length, m.lh.length);
  return Math.min(Math.max(110, 58 + n * 42), 360);
}

function buildNote(ev: NoteEvent, clef: "treble" | "bass"): StaveNote {
  const isRest = !!ev.rest || !ev.keys?.length;
  const note = new StaveNote({
    clef,
    keys: isRest ? [clef === "treble" ? "b/4" : "d/3"] : ev.keys!.map(toVexKey),
    duration: ev.d + (isRest ? "r" : ""),
    auto_stem: true,
  });
  if (ev.dots === 1) Dot.buildAndAttach([note], { all: true });
  if (!isRest && ev.f !== undefined) {
    const fing = new Annotation(String(ev.f));
    fing.setFont("Inter", 9, "600");
    fing.setVerticalJustification(
      clef === "treble" ? Annotation.VerticalJustify.TOP : Annotation.VerticalJustify.BOTTOM,
    );
    note.addModifier(fing);
  }
  if (!isRest && ev.dyn) {
    const dyn = new Annotation(ev.dyn);
    dyn.setFont("Georgia", 12, "normal", "italic");
    dyn.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
    note.addModifier(dyn);
  }
  return note;
}

function handStartIndices(measures: Measure[], hand: "rh" | "lh"): number[] {
  const starts: number[] = [];
  let idx = 0;
  measures.forEach((m) => {
    starts.push(idx);
    idx += m[hand].length;
  });
  return starts;
}

export function SheetMusic({
  measures, keySignature, timeSignature, highlight, showLeftHand = true,
}: SheetMusicProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const systemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [width, setWidth] = useState(960);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const systems = useMemo<System[]>(() => {
    const available = Math.max(width - 24, 320);
    const out: System[] = [];
    let current: Measure[] = [];
    let widths: number[] = [];
    let used = 88;
    let start = 0;
    measures.forEach((m, i) => {
      const w = naturalWidth(m);
      if (current.length > 0 && used + w > available) {
        out.push({ startMeasure: start, measures: current, widths });
        current = [];
        widths = [];
        used = 88;
        start = i;
      }
      current.push(m);
      widths.push(w);
      used += w;
    });
    if (current.length) out.push({ startMeasure: start, measures: current, widths });
    return out.map((sys, i) => {
      const natural = sys.widths.reduce((a, b) => a + b, 0);
      const isLast = i === out.length - 1;
      const target = available - 88;
      const scale = isLast ? Math.min(target / natural, 1.4) : target / natural;
      return { ...sys, widths: sys.widths.map((w) => w * scale) };
    });
  }, [measures, width]);

  const rhStarts = useMemo(() => handStartIndices(measures, "rh"), [measures]);
  const lhStarts = useMemo(() => handStartIndices(measures, "lh"), [measures]);

  useEffect(() => {
    systems.forEach((sys, sysIdx) => {
      const host = systemRefs.current[sysIdx];
      if (!host) return;
      host.innerHTML = "";

      const beatsPerMeasure = measureBeats(timeSignature);
      const systemHeight = showLeftHand ? 248 : 138;
      const totalW = sys.widths.reduce((a, b) => a + b, 0) + 88;
      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(totalW + 4, systemHeight);
      const ctx = renderer.getContext();

      // per-measure built notes, kept for tie rendering across the system
      const builtRh: StaveNote[][] = [];
      const builtLh: StaveNote[][] = [];

      let x = 2;
      sys.measures.forEach((measure, mi) => {
        const first = mi === 0;
        const w = sys.widths[mi] + (first ? 86 : 0);
        const treble = new Stave(x, 18, w);
        const bass = showLeftHand ? new Stave(x, 124, w) : null;
        if (first) {
          treble.addClef("treble").addKeySignature(keySignature);
          bass?.addClef("bass").addKeySignature(keySignature);
          if (sysIdx === 0) {
            treble.addTimeSignature(timeSignature);
            bass?.addTimeSignature(timeSignature);
          }
        }
        treble.setContext(ctx).draw();
        bass?.setContext(ctx).draw();

        if (first && bass) {
          new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
          new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        if (bass && mi === sys.measures.length - 1) {
          new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        }

        const rhNotes = measure.rh.map((ev) => buildNote(ev, "treble"));
        const lhNotes = bass ? measure.lh.map((ev) => buildNote(ev, "bass")) : [];
        builtRh.push(rhNotes);
        builtLh.push(lhNotes);

        const applyHighlight = (
          notes: StaveNote[], base: number, current: number | undefined,
        ) => {
          if (current === undefined) return;
          notes.forEach((note, ni) => {
            const flat = base + ni;
            if (flat === current) {
              note.setStyle({ fillStyle: COLOR_CURRENT, strokeStyle: COLOR_CURRENT });
            } else if (flat < current) {
              note.setStyle({ fillStyle: COLOR_DONE, strokeStyle: COLOR_DONE });
            }
          });
        };
        applyHighlight(rhNotes, rhStarts[sys.startMeasure + mi], highlight?.rh);
        if (bass) applyHighlight(lhNotes, lhStarts[sys.startMeasure + mi], highlight?.lh);

        const rhVoice = new Voice({ num_beats: beatsPerMeasure, beat_value: 4 })
          .setStrict(false)
          .addTickables(rhNotes);
        const voices = [rhVoice];
        if (bass) {
          voices.push(
            new Voice({ num_beats: beatsPerMeasure, beat_value: 4 })
              .setStrict(false)
              .addTickables(lhNotes),
          );
        }
        try {
          Accidental.applyAccidentals(voices, keySignature);
        } catch {
          /* fall back to key-signature-only rendering */
        }

        const rhBeams = Beam.generateBeams(rhNotes);
        const lhBeams = bass ? Beam.generateBeams(lhNotes) : [];

        const formatter = new Formatter();
        voices.forEach((v) => formatter.joinVoices([v]));
        const formatWidth = w - (treble.getNoteStartX() - treble.getX()) - 14;
        formatter.format(voices, Math.max(formatWidth, 40));

        rhVoice.draw(ctx, treble);
        if (bass) voices[1].draw(ctx, bass);
        [...rhBeams, ...lhBeams].forEach((b) => b.setContext(ctx).draw());

        x += w;
      });

      // ties (within a system; chains crossing a line break sound correctly but aren't drawn)
      const drawTies = (hand: "rh" | "lh", built: StaveNote[][]) => {
        sys.measures.forEach((measure, mi) => {
          measure[hand].forEach((ev, ni) => {
            if (!ev.tie || ev.rest) return;
            let target: StaveNote | undefined;
            const sameKeys = (other?: NoteEvent) =>
              other && !other.rest && other.keys?.join() === ev.keys?.join();
            if (ni + 1 < measure[hand].length && sameKeys(measure[hand][ni + 1])) {
              target = built[mi][ni + 1];
            } else if (mi + 1 < sys.measures.length && sameKeys(sys.measures[mi + 1][hand][0])) {
              target = built[mi + 1][0];
            }
            if (target) {
              new StaveTie({ first_note: built[mi][ni], last_note: target })
                .setContext(ctx)
                .draw();
            }
          });
        });
      };
      drawTies("rh", builtRh);
      if (showLeftHand) drawTies("lh", builtLh);
    });
  }, [systems, keySignature, timeSignature, highlight, showLeftHand, rhStarts, lhStarts]);

  // keep the active system in view during practice/playback
  useEffect(() => {
    const anchor = highlight?.rh ?? highlight?.lh;
    if (anchor === undefined) return;
    const starts = highlight?.rh !== undefined ? rhStarts : lhStarts;
    const sysIdx = systems.findIndex((sys, i) => {
      const next = systems[i + 1];
      const start = starts[sys.startMeasure];
      const end = next ? starts[next.startMeasure] : Infinity;
      return anchor >= start && anchor < end;
    });
    if (sysIdx >= 0) {
      systemRefs.current[sysIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlight, systems, rhStarts, lhStarts]);

  return (
    <div ref={wrapRef} className="notation">
      {systems.map((_, i) => (
        <div
          key={i}
          ref={(el) => { systemRefs.current[i] = el; }}
        />
      ))}
    </div>
  );
}
