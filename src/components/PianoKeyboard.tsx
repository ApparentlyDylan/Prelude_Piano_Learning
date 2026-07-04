import { useEffect, useMemo } from "react";
import "./piano.css";

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
const PC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Computer-keyboard mapping: home row = white keys from C4, top row = black keys. */
const KEY_TO_MIDI: Record<string, number> = {
  KeyA: 60, KeyW: 61, KeyS: 62, KeyE: 63, KeyD: 64, KeyF: 65, KeyT: 66,
  KeyG: 67, KeyY: 68, KeyH: 69, KeyU: 70, KeyJ: 71, KeyK: 72, KeyO: 73,
  KeyL: 74, KeyP: 75, Semicolon: 76,
};

interface PianoKeyboardProps {
  from?: number; // MIDI
  to?: number;
  onPress?: (midi: number) => void;
  highlight?: Set<number>;
  pressed?: Set<number>;
  enableComputerKeys?: boolean;
}

export function PianoKeyboard({
  from = 48, to = 84, onPress, highlight, pressed, enableComputerKeys = false,
}: PianoKeyboardProps) {
  const keys = useMemo(() => {
    const list: Array<{ midi: number; black: boolean; whiteIndex: number }> = [];
    let whiteIndex = 0;
    for (let midi = from; midi <= to; midi++) {
      const black = BLACK_PCS.has(midi % 12);
      list.push({ midi, black, whiteIndex: black ? whiteIndex - 1 : whiteIndex });
      if (!black) whiteIndex += 1;
    }
    return list;
  }, [from, to]);

  const whiteCount = keys.filter((k) => !k.black).length;

  useEffect(() => {
    if (!enableComputerKeys || !onPress) return;
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      const midi = KEY_TO_MIDI[e.code];
      if (midi !== undefined) {
        e.preventDefault();
        onPress(midi);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [enableComputerKeys, onPress]);

  const whiteW = 100 / whiteCount;

  return (
    <div className="piano" role="group" aria-label="Piano keyboard">
      {keys.filter((k) => !k.black).map((k) => (
        <button
          key={k.midi}
          className={[
            "piano__white",
            highlight?.has(k.midi) ? "is-hint" : "",
            pressed?.has(k.midi) ? "is-down" : "",
          ].join(" ")}
          style={{ width: `${whiteW}%` }}
          onPointerDown={() => onPress?.(k.midi)}
          aria-label={PC_NAMES[k.midi % 12] + String(Math.floor(k.midi / 12) - 1)}
        >
          {k.midi % 12 === 0 && (
            <span className="piano__label">C{Math.floor(k.midi / 12) - 1}</span>
          )}
        </button>
      ))}
      {keys.filter((k) => k.black).map((k) => (
        <button
          key={k.midi}
          className={[
            "piano__black",
            highlight?.has(k.midi) ? "is-hint" : "",
            pressed?.has(k.midi) ? "is-down" : "",
          ].join(" ")}
          style={{ left: `calc(${(k.whiteIndex + 1) * whiteW}% - ${whiteW * 0.29}%)`, width: `${whiteW * 0.58}%` }}
          onPointerDown={() => onPress?.(k.midi)}
          aria-label={PC_NAMES[k.midi % 12] + String(Math.floor(k.midi / 12) - 1)}
        />
      ))}
    </div>
  );
}
