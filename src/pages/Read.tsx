import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EarTrainer } from "../components/EarTrainer";
import { Reveal } from "../components/Reveal";
import { SheetMusic } from "../components/SheetMusic";
import { SingleNote } from "../components/SingleNote";
import { PianoKeyboard } from "../components/PianoKeyboard";
import { Piano } from "../lib/sampler";
import { nameToMidi } from "../lib/music";
import { useStore } from "../lib/store";
import type { Measure } from "../lib/types";
import "./read.css";

const C_SCALE: Measure[] = [
  {
    rh: [
      { keys: ["C4"], d: "q" }, { keys: ["D4"], d: "q" },
      { keys: ["E4"], d: "q" }, { keys: ["F4"], d: "q" },
    ],
    lh: [],
  },
  {
    rh: [
      { keys: ["G4"], d: "q" }, { keys: ["A4"], d: "q" },
      { keys: ["B4"], d: "q" }, { keys: ["C5"], d: "q" },
    ],
    lh: [],
  },
];

const LANDMARKS: Measure[] = [
  {
    rh: [{ keys: ["C4"], d: "h" }, { keys: ["G4"], d: "h" }],
    lh: [{ keys: ["C3"], d: "h" }, { keys: ["F3"], d: "h" }],
  },
  {
    rh: [{ keys: ["C5"], d: "w" }],
    lh: [{ keys: ["C2"], d: "w" }],
  },
];

const RHYTHM_DEMO: Measure[] = [
  { rh: [{ keys: ["G4"], d: "w" }], lh: [] },
  { rh: [{ keys: ["G4"], d: "h" }, { keys: ["G4"], d: "h" }], lh: [] },
  { rh: [{ keys: ["G4"], d: "q" }, { keys: ["G4"], d: "q" }, { keys: ["G4"], d: "q" }, { keys: ["G4"], d: "q" }], lh: [] },
  { rh: [{ keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }, { keys: ["G4"], d: "8" }], lh: [] },
];

const TREBLE_POOL = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"];
const TREBLE_LEDGER = ["A3", "B3", "A5", "B5", "C6"];
const BASS_POOL = ["G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"];
const BASS_LEDGER = ["C2", "D2", "E2", "F2", "D4", "E4"];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

type TrainerMode = "treble" | "bass" | "both";

function randomNote(mode: TrainerMode, ledger: boolean, exclude: string): { note: string; clef: "treble" | "bass" } {
  const clef: "treble" | "bass" =
    mode === "both" ? (Math.random() < 0.5 ? "treble" : "bass") : mode;
  const pool = clef === "treble"
    ? (ledger ? [...TREBLE_POOL, ...TREBLE_LEDGER] : TREBLE_POOL)
    : (ledger ? [...BASS_POOL, ...BASS_LEDGER] : BASS_POOL);
  let note = pool[Math.floor(Math.random() * pool.length)];
  if (note === exclude && pool.length > 1) {
    note = pool[(pool.indexOf(note) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length];
  }
  return { note, clef };
}

function NoteTrainer() {
  const { logQuiz, quiz } = useStore();
  const [mode, setMode] = useState<TrainerMode>("treble");
  const [ledger, setLedger] = useState(false);
  const [current, setCurrent] = useState(() => randomNote("treble", false, ""));
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");
  const synth = useMemo(() => new Piano(), []);

  const advance = useCallback((wasRight: boolean) => {
    const nextStreak = wasRight ? streak + 1 : 0;
    setStreak(nextStreak);
    logQuiz(wasRight, nextStreak);
    setFeedback(wasRight ? "right" : "wrong");
    if (wasRight) {
      synth.playNote(nameToMidi(current.note), synth.now, 0.7);
      setTimeout(() => {
        setFeedback("idle");
        setCurrent(randomNote(mode, ledger, current.note));
      }, 420);
    } else {
      setTimeout(() => setFeedback("idle"), 500);
    }
  }, [streak, logQuiz, synth, current.note, mode, ledger]);

  const answerLetter = (letter: string) => {
    if (feedback === "right") return;
    advance(letter === current.note[0]);
  };

  const answerKey = (midi: number) => {
    if (feedback === "right") return;
    advance(midi % 12 === nameToMidi(current.note) % 12);
  };

  const setModeAndReset = (m: TrainerMode) => {
    setMode(m);
    setCurrent(randomNote(m, ledger, ""));
    setStreak(0);
  };

  const accuracy = quiz.answered ? Math.round((quiz.correct / quiz.answered) * 100) : null;

  return (
    <div className="trainer card">
      <div className="trainer__toolbar">
        <div className="trainer__modes">
          {(["treble", "bass", "both"] as const).map((m) => (
            <button
              key={m}
              className={`trainer__mode${mode === m ? " is-active" : ""}`}
              onClick={() => setModeAndReset(m)}
            >
              {m === "treble" ? "Treble" : m === "bass" ? "Bass" : "Both clefs"}
            </button>
          ))}
        </div>
        <label className="trainer__ledger">
          <input
            type="checkbox"
            checked={ledger}
            onChange={(e) => { setLedger(e.target.checked); setCurrent(randomNote(mode, e.target.checked, "")); }}
          />
          Ledger lines
        </label>
      </div>

      <motion.div
        key={current.note + current.clef}
        className={`trainer__stage trainer__stage--${feedback}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={feedback === "wrong" ? { opacity: 1, scale: 1, x: [0, -7, 7, -4, 0] } : { opacity: 1, scale: 1 }}
        transition={{ duration: feedback === "wrong" ? 0.35 : 0.3 }}
      >
        <SingleNote note={current.note} clef={current.clef} />
      </motion.div>

      <div className="trainer__letters">
        {LETTERS.map((l) => (
          <button key={l} className="trainer__letter" onClick={() => answerLetter(l)}>
            {l}
          </button>
        ))}
      </div>

      <PianoKeyboard from={60} to={72} onPress={answerKey} />

      <div className="trainer__stats">
        <span>Streak <strong>{streak}</strong></span>
        <span>Best <strong>{quiz.bestStreak}</strong></span>
        <span>Answered <strong>{quiz.answered}</strong></span>
        {accuracy !== null && <span>Accuracy <strong>{accuracy}%</strong></span>}
      </div>
    </div>
  );
}

export function Read() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 150);
  }, [hash]);

  return (
    <div className="read">
      <section className="read__hero">
        <div className="container--narrow">
          <Reveal>
            <span className="eyebrow">Reading music</span>
            <h1 className="title-lg read__title">Notation is just a map of the keyboard.</h1>
            <p className="lede">
              Every symbol on a page of sheet music answers one of two questions:
              which key, and for how long. This course teaches both — then drills
              them until reading feels like recognizing faces.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="read__section">
        <div className="container--narrow">
          <Reveal>
            <h2 className="title-md">1 · The grand staff</h2>
            <p className="read__prose">
              Piano music is written on two staves joined by a brace: the treble
              staff on top, usually played by the right hand, and the bass staff
              below, usually the left. Each staff has five lines and four spaces,
              and every line and space is a letter from A to G. Between the two
              staves sits <strong>middle C</strong> — the note on its own little
              ledger line, and your anchor for everything else.
            </p>
            <p className="read__prose">
              Below, the first measure shows two landmarks per hand; the second
              shows the Cs an octave out in each direction. Learn these five notes
              cold and you can find any other note by counting neighbors.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <SheetMusic measures={LANDMARKS} keySignature="C" timeSignature="4/4" />
          </Reveal>
        </div>
      </section>

      <section className="read__section">
        <div className="container--narrow">
          <Reveal>
            <h2 className="title-md">2 · Naming the notes</h2>
            <p className="read__prose">
              Notes climb the staff alphabetically — line, space, line, space —
              and the alphabet wraps after G. On the treble staff the lines are
              E-G-B-D-F (<em>Every Good Beginner Does Fine</em>) and the spaces
              spell F-A-C-E. On the bass staff the lines are G-B-D-F-A and the
              spaces A-C-E-G. Here is a C major scale climbing from middle C:
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <SheetMusic measures={C_SCALE} keySignature="C" timeSignature="4/4" showLeftHand={false} />
          </Reveal>
        </div>
      </section>

      <section className="read__section">
        <div className="container--narrow">
          <Reveal>
            <h2 className="title-md">3 · Rhythm: how long to hold</h2>
            <p className="read__prose">
              A note's shape sets its length. A hollow note with no stem is a{" "}
              <strong>whole note</strong> (four beats). Give it a stem and it
              becomes a <strong>half note</strong> (two beats). Fill in the head
              for a <strong>quarter note</strong> (one beat), and add a flag or
              beam for <strong>eighth notes</strong> (half a beat each). A dot
              after any note adds half its value again. The four measures below
              all fill the same four beats:
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <SheetMusic measures={RHYTHM_DEMO} keySignature="C" timeSignature="4/4" showLeftHand={false} />
          </Reveal>
          <Reveal>
            <p className="read__prose">
              The <strong>time signature</strong> at the start of a piece tells
              you how those beats group into measures: the top number is beats per
              measure, the bottom is which note gets the beat. 4/4 means four
              quarter-note beats; 3/4 is the lilting three of a waltz or minuet.
              Count aloud while you play — "1 and 2 and…" — until the numbers
              disappear into feel.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="read__section">
        <div className="container--narrow">
          <Reveal>
            <h2 className="title-md">4 · Sharps, flats & key signatures</h2>
            <p className="read__prose">
              A <strong>sharp (♯)</strong> raises a note to the next key to the
              right — usually a black key — and a <strong>flat (♭)</strong> lowers
              it one key to the left. When a piece uses the same sharps or flats
              throughout, they're printed once at the start of every line as the{" "}
              <strong>key signature</strong> instead of cluttering the score. One
              sharp means every F is F♯ (the key of G major); one flat makes every
              B a B♭ (F major). A <strong>natural (♮)</strong> cancels either for
              the rest of the measure.
            </p>
            <p className="read__prose">
              You'll meet key signatures gently in the piece library — level-one
              pieces stay in C and G, and each level adds at most a sharp or flat
              at a time.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="read__section read__section--trainer">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Daily drill</span>
            <h2 className="title-md read__trainer-title">The note trainer</h2>
            <p className="read__prose read__trainer-lede">
              Name the note on the staff — tap a letter, or play the matching key.
              A few minutes a day is enough; speed comes from repetition, not effort.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <NoteTrainer />
          </Reveal>
        </div>
      </section>

      <section className="read__section" id="ear-trainer">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Train your ear</span>
            <h2 className="title-md read__trainer-title">The ear trainer</h2>
            <p className="read__prose read__trainer-lede">
              Reading connects the page to your hands; listening connects it to
              your ear. Name intervals and chord qualities by sound alone — the
              skill behind playing by ear, memorizing faster, and catching your
              own wrong notes.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <EarTrainer />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
