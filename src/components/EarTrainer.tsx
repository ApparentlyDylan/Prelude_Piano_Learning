import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Piano } from "../lib/sampler";
import { useStore } from "../lib/store";
import "./ear.css";

type EarMode = "intervals" | "chords";

const INTERVALS: Array<{ name: string; semis: number }> = [
  { name: "Minor 2nd", semis: 1 },
  { name: "Major 2nd", semis: 2 },
  { name: "Minor 3rd", semis: 3 },
  { name: "Major 3rd", semis: 4 },
  { name: "Perfect 4th", semis: 5 },
  { name: "Perfect 5th", semis: 7 },
  { name: "Major 6th", semis: 9 },
  { name: "Octave", semis: 12 },
];

const CHORDS: Array<{ name: string; intervals: number[] }> = [
  { name: "Major", intervals: [0, 4, 7] },
  { name: "Minor", intervals: [0, 3, 7] },
  { name: "Diminished", intervals: [0, 3, 6] },
  { name: "Dominant 7th", intervals: [0, 4, 7, 10] },
];

interface Question {
  root: number;
  answer: number; // index into INTERVALS or CHORDS
}

function randomQuestion(mode: EarMode, excludeAnswer: number): Question {
  const pool = mode === "intervals" ? INTERVALS : CHORDS;
  let answer = Math.floor(Math.random() * pool.length);
  if (answer === excludeAnswer) answer = (answer + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  return { root: 48 + Math.floor(Math.random() * 20), answer };
}

export function EarTrainer() {
  const { logEar, ear } = useStore();
  const synth = useMemo(() => new Piano(), []);
  const [mode, setMode] = useState<EarMode>("intervals");
  const [question, setQuestion] = useState<Question>(() => randomQuestion("intervals", -1));
  const [played, setPlayed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");
  const lockRef = useRef(false);

  const play = useCallback((q: Question, m: EarMode) => {
    setPlayed(true);
    const t = synth.now + 0.05;
    if (m === "intervals") {
      synth.playNote(q.root, t, 0.8);
      synth.playNote(q.root + INTERVALS[q.answer].semis, t + 0.75, 1.0);
    } else {
      CHORDS[q.answer].intervals.forEach((iv) => synth.playNote(q.root + iv, t, 1.4, 0.8));
    }
  }, [synth]);

  const answer = (idx: number) => {
    if (!played || lockRef.current) return;
    const right = idx === question.answer;
    const nextStreak = right ? streak + 1 : 0;
    setStreak(nextStreak);
    logEar(right, nextStreak);
    setFeedback(right ? "right" : "wrong");
    if (right) {
      lockRef.current = true;
      setTimeout(() => {
        const q = randomQuestion(mode, question.answer);
        setQuestion(q);
        setFeedback("idle");
        lockRef.current = false;
        play(q, mode);
      }, 650);
    } else {
      setTimeout(() => setFeedback("idle"), 500);
    }
  };

  const switchMode = (m: EarMode) => {
    setMode(m);
    setStreak(0);
    setPlayed(false);
    setFeedback("idle");
    setQuestion(randomQuestion(m, -1));
  };

  const pool = mode === "intervals" ? INTERVALS.map((i) => i.name) : CHORDS.map((c) => c.name);
  const accuracy = ear.answered ? Math.round((ear.correct / ear.answered) * 100) : null;

  return (
    <div className="ear card">
      <div className="ear__toolbar">
        <div className="seg">
          {(["intervals", "chords"] as const).map((m) => (
            <button
              key={m}
              className={`seg__btn${mode === m ? " is-active" : ""}`}
              onClick={() => switchMode(m)}
            >
              {m === "intervals" ? "Intervals" : "Chords"}
            </button>
          ))}
        </div>
        <button className="btn btn--sm btn--accent" onClick={() => play(question, mode)}>
          {played ? "↻ Play again" : "▶ Play the sound"}
        </button>
      </div>

      <motion.div
        className={`ear__stage ear__stage--${feedback}`}
        animate={feedback === "wrong" ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
      >
        {!played ? (
          <span className="ear__prompt">Press play, then name what you hear.</span>
        ) : mode === "intervals" ? (
          <span className="ear__prompt">Two notes, played low to high. What's the distance?</span>
        ) : (
          <span className="ear__prompt">One chord. What's its quality?</span>
        )}
      </motion.div>

      <div className={`ear__answers${mode === "chords" ? " ear__answers--chords" : ""}`}>
        {pool.map((name, i) => (
          <button key={name} className="ear__answer" onClick={() => answer(i)} disabled={!played}>
            {name}
          </button>
        ))}
      </div>

      <div className="ear__stats">
        <span>Streak <strong>{streak}</strong></span>
        <span>Best <strong>{ear.bestStreak}</strong></span>
        <span>Answered <strong>{ear.answered}</strong></span>
        {accuracy !== null && <span>Accuracy <strong>{accuracy}%</strong></span>}
      </div>
    </div>
  );
}
