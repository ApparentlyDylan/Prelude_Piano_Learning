import { useEffect, useRef } from "react";
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { toVexKey } from "../lib/music";

interface SingleNoteProps {
  note: string; // e.g. "F#4"
  clef: "treble" | "bass";
  width?: number;
}

/** One large note on one stave — used by the note-reading trainer. */
export function SingleNote({ note, clef, width = 260 }: SingleNoteProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, 150);
    const ctx = renderer.getContext();
    const stave = new Stave(6, 26, width - 14);
    stave.addClef(clef);
    stave.setContext(ctx).draw();

    const staveNote = new StaveNote({ clef, keys: [toVexKey(note)], duration: "w" });
    if (note.includes("#")) staveNote.addModifier(new Accidental("#"));
    else if (note.includes("b")) staveNote.addModifier(new Accidental("b"));

    const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
    voice.addTickables([staveNote]);
    new Formatter().joinVoices([voice]).format([voice], width - 90);
    voice.draw(ctx, stave);
  }, [note, clef, width]);

  return <div ref={ref} style={{ display: "flex", justifyContent: "center" }} />;
}
