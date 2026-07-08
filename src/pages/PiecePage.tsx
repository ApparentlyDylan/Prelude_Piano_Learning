import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { SheetMusic } from "../components/SheetMusic";
import type { HandHighlight } from "../components/SheetMusic";
import { PianoKeyboard } from "../components/PianoKeyboard";
import { pieceById } from "../data";
import { Piano, Metronome } from "../lib/sampler";
import { connectMidi } from "../lib/midi";
import type { MidiConnection } from "../lib/midi";
import { MicListener } from "../lib/pitch";
import type { MicDebug } from "../lib/pitch";
import { flattenHand, measureBeats, LEVEL_NAMES, midiToName } from "../lib/music";
import type { FlatNote } from "../lib/music";
import { useStore } from "../lib/store";
import "./pieces.css";

type InputMethod = "screen" | "midi" | "mic";
type Hand = "rh" | "lh" | "both";
type PracticeMode = "wait" | "tempo";

interface GroupNote {
  hand: "rh" | "lh";
  index: number;
  midi: number[];
  keys: string[];
}

interface Group {
  time: number;
  notes: GroupNote[];
}

interface PracticeResult {
  accuracy: number;
  timing?: number;
  correct: number;
  wrong: number;
}

interface Session {
  groups: Group[];
  groupIdx: number;
  sat: boolean[];
  correct: number;
  wrong: number;
  offsets: number[];
  startedAt: number;
  t0: number;
  secPerBeat: number;
  windowBeats: number;
  mode: PracticeMode;
  active: boolean;
}

export function PiecePage() {
  const { pieceId } = useParams();
  const piece = pieceId ? pieceById(pieceId) : undefined;
  const { recordPractice, logActivity, pieceStats } = useStore();

  const synth = useMemo(() => new Piano(), []);
  const metro = useMemo(() => new Metronome(), []);
  const rhFlat = useMemo(() => (piece ? flattenHand(piece.measures, "rh") : []), [piece]);
  const lhFlat = useMemo(() => (piece ? flattenHand(piece.measures, "lh") : []), [piece]);

  const [tempo, setTempo] = useState(piece?.tempo ?? 100);
  const [hand, setHand] = useState<Hand>("rh");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("wait");
  const [inputMethod, setInputMethod] = useState<InputMethod>("screen");
  const [playing, setPlaying] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [highlight, setHighlight] = useState<HandHighlight | undefined>(undefined);
  const [micError, setMicError] = useState<string | null>(null);
  const [midiName, setMidiName] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [hintMidis, setHintMidis] = useState<Set<number> | undefined>(undefined);
  const [progressPct, setProgressPct] = useState(0);
  const [micDebug, setMicDebug] = useState<MicDebug | null>(null);

  const rafRef = useRef(0);
  const tickTimerRef = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const micRef = useRef<MicListener | null>(null);
  const midiRef = useRef<MidiConnection | null>(null);

  const hands = useMemo<Array<"rh" | "lh">>(
    () => (hand === "both" ? ["rh", "lh"] : [hand]),
    [hand],
  );

  const keyboardRange = useMemo(() => {
    const midis = hands
      .flatMap((h) => (h === "rh" ? rhFlat : lhFlat))
      .flatMap((n) => n.midi);
    if (!midis.length) return { from: 48, to: 84 };
    const lo = Math.floor(Math.min(...midis) / 12) * 12;
    const hi = Math.ceil((Math.max(...midis) + 1) / 12) * 12;
    return { from: Math.max(24, lo), to: Math.min(96, hi) };
  }, [hands, rhFlat, lhFlat]);

  const buildGroups = useCallback((): Group[] => {
    const evs: Array<GroupNote & { time: number }> = [];
    for (const h of hands) {
      for (const n of h === "rh" ? rhFlat : lhFlat) {
        if (n.isRest || n.isTieCont) continue;
        evs.push({ hand: h, index: n.index, midi: n.midi, keys: n.keys, time: n.startBeats });
      }
    }
    evs.sort((a, b) => a.time - b.time);
    const groups: Group[] = [];
    for (const e of evs) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.time - e.time) < 1e-6) {
        last.notes.push(e);
      } else {
        groups.push({ time: e.time, notes: [e] });
      }
    }
    return groups;
  }, [hands, rhFlat, lhFlat]);

  /* ---------------- shared UI sync ---------------- */

  const syncPracticeUI = useCallback(() => {
    const s = sessionRef.current;
    if (!s || !s.active) return;
    const g = s.groups[s.groupIdx];
    const next: HandHighlight = {};
    for (const h of hands) {
      let idx: number | undefined;
      for (let gi = s.groupIdx; gi < s.groups.length; gi++) {
        const note = s.groups[gi].notes.find((n) => n.hand === h);
        if (note) { idx = note.index; break; }
      }
      next[h] = idx ?? (h === "rh" ? rhFlat.length : lhFlat.length);
    }
    setHighlight(next);
    setHintMidis(
      g ? new Set(g.notes.filter((_, i) => !s.sat[i]).flatMap((n) => n.midi)) : undefined,
    );
    setProgressPct(s.groups.length ? Math.round((s.groupIdx / s.groups.length) * 100) : 0);
  }, [hands, rhFlat.length, lhFlat.length]);

  /* ---------------- playback ---------------- */

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    synth.stopAll();
    setPlaying(false);
    setHighlight(undefined);
  }, [synth]);

  const startPlayback = useCallback(() => {
    if (!piece) return;
    stopPlayback();
    setPlaying(true);
    const secPerBeat = 60 / tempo;
    const t0 = synth.now + 0.15;
    const schedule = (notes: FlatNote[]) => {
      notes.forEach((n) => {
        if (n.isRest || n.playBeats === 0) return;
        n.midi.forEach((m) =>
          synth.playNote(m, t0 + n.startBeats * secPerBeat, n.playBeats * secPerBeat),
        );
      });
    };
    schedule(rhFlat);
    schedule(lhFlat);

    const totalBeats = piece.measures.length * measureBeats(piece.timeSignature);
    const indexAt = (flats: FlatNote[], elapsed: number): number | undefined => {
      for (let i = flats.length - 1; i >= 0; i--) {
        if (flats[i].startBeats <= elapsed) return i;
      }
      return undefined;
    };
    const tick = () => {
      const elapsed = (synth.now - t0) / secPerBeat;
      if (elapsed >= totalBeats + 1) {
        setPlaying(false);
        setHighlight(undefined);
        return;
      }
      setHighlight(
        elapsed < 0
          ? undefined
          : { rh: indexAt(rhFlat, elapsed), lh: indexAt(lhFlat, elapsed) },
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [piece, tempo, synth, rhFlat, lhFlat, stopPlayback]);

  /* ---------------- practice ---------------- */

  const endPractice = useCallback((finished: boolean) => {
    const s = sessionRef.current;
    if (!s) return;
    s.active = false;
    cancelAnimationFrame(rafRef.current);
    clearInterval(tickTimerRef.current);
    metro.stopAll();
    setPracticing(false);
    setHighlight(undefined);
    setHintMidis(undefined);
    setCountIn(null);
    micRef.current?.stop();
    micRef.current = null;
    midiRef.current?.dispose();
    midiRef.current = null;
    setLastHeard(null);
    setMicDebug(null);

    const elapsedMin = (Date.now() - s.startedAt) / 60000;
    if (s.correct + s.wrong > 0 && piece) {
      const accuracy = Math.round((s.correct / (s.correct + s.wrong)) * 100);
      if (finished) {
        let timing: number | undefined;
        if (s.mode === "tempo" && s.offsets.length) {
          const avg = s.offsets.reduce((a, b) => a + Math.abs(b), 0) / s.offsets.length;
          timing = Math.max(0, Math.min(100, Math.round(100 * (1 - avg / s.windowBeats))));
        }
        recordPractice(piece.id, accuracy);
        setResult({ accuracy, timing, correct: s.correct, wrong: s.wrong });
      }
      logActivity(Math.max(elapsedMin, 0.1));
    }
  }, [piece, metro, recordPractice, logActivity]);

  const advanceGroup = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    s.groupIdx += 1;
    if (s.groupIdx >= s.groups.length) {
      endPractice(true);
      return;
    }
    s.sat = s.groups[s.groupIdx].notes.map(() => false);
    syncPracticeUI();
  }, [endPractice, syncPracticeUI]);

  const handleInput = useCallback((midi: number) => {
    const s = sessionRef.current;
    if (!s?.active) return;
    const g = s.groups[s.groupIdx];
    if (!g) return;
    setLastHeard(midiToName(midi));

    const matchIdx = g.notes.findIndex((n, i) =>
      !s.sat[i] &&
      (inputMethod === "mic"
        ? n.midi.some((m) => m % 12 === midi % 12)
        : n.midi.includes(midi)),
    );

    if (matchIdx >= 0) {
      s.sat[matchIdx] = true;
      s.correct += 1;
      if (s.mode === "tempo") {
        const nowBeats = (synth.now - s.t0) / s.secPerBeat;
        s.offsets.push(nowBeats - g.time);
      }
      if (inputMethod !== "mic") {
        g.notes[matchIdx].midi.forEach((m) => synth.playNote(m, synth.now, 0.5));
      }
      if (s.sat.every(Boolean)) advanceGroup();
      else syncPracticeUI();
    } else {
      s.wrong += 1;
      if (inputMethod === "screen") synth.playNote(midi, synth.now, 0.3, 0.5);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 300);
    }
  }, [inputMethod, synth, advanceGroup, syncPracticeUI]);

  const handleInputRef = useRef(handleInput);
  useEffect(() => { handleInputRef.current = handleInput; }, [handleInput]);

  const startPractice = useCallback(async () => {
    if (!piece) return;
    stopPlayback();
    setResult(null);
    setMicError(null);

    const groups = buildGroups();
    if (!groups.length) return;
    const secPerBeat = 60 / tempo;
    const beatsPerMeasure = measureBeats(piece.timeSignature);
    const isTempo = practiceMode === "tempo";
    const t0 = synth.now + (isTempo ? 0.3 + beatsPerMeasure * secPerBeat : 0);

    sessionRef.current = {
      groups,
      groupIdx: 0,
      sat: groups[0].notes.map(() => false),
      correct: 0,
      wrong: 0,
      offsets: [],
      startedAt: Date.now(),
      t0,
      secPerBeat,
      windowBeats: Math.max(0.5, beatsPerMeasure * 0.15),
      mode: practiceMode,
      active: true,
    };
    setPracticing(true);
    syncPracticeUI();

    if (isTempo) {
      const totalBeats = piece.measures.length * beatsPerMeasure;
      metro.schedule(synth.now + 0.3, totalBeats + beatsPerMeasure, secPerBeat, beatsPerMeasure);
      // interval, not rAF: keeps grading alive if the tab is backgrounded mid-practice
      tickTimerRef.current = window.setInterval(() => {
        const s = sessionRef.current;
        if (!s?.active) {
          clearInterval(tickTimerRef.current);
          return;
        }
        const nowBeats = (synth.now - s.t0) / s.secPerBeat;
        if (nowBeats < 0) {
          const remaining = Math.ceil(-nowBeats);
          setCountIn((prev) => (prev === remaining ? prev : remaining));
        } else {
          setCountIn((prev) => (prev === null ? prev : null));
          let g = s.groups[s.groupIdx];
          while (g && nowBeats > g.time + s.windowBeats) {
            const missed = s.sat.filter((x) => !x).length;
            s.wrong += missed;
            s.groupIdx += 1;
            if (s.groupIdx >= s.groups.length) {
              endPractice(true);
              return;
            }
            s.sat = s.groups[s.groupIdx].notes.map(() => false);
            syncPracticeUI();
            g = s.groups[s.groupIdx];
          }
        }
      }, 50);
    }

    if (inputMethod === "mic") {
      const mic = new MicListener();
      try {
        await mic.start((midi) => handleInputRef.current(midi), setMicDebug);
        micRef.current = mic;
      } catch {
        setMicError("Microphone access was blocked. Allow it in the browser, or choose another input.");
        endPractice(false);
      }
    } else if (inputMethod === "midi") {
      const conn = await connectMidi((midi) => handleInputRef.current(midi));
      if (!conn.supported) {
        setMicError("Web MIDI isn't available in this browser. Chrome and Edge support it.");
      } else {
        setMidiName(conn.deviceName ?? "MIDI device connected");
      }
      midiRef.current = conn;
    }
  }, [piece, stopPlayback, buildGroups, tempo, practiceMode, inputMethod, synth, metro, syncPracticeUI, endPractice]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(tickTimerRef.current);
    micRef.current?.stop();
    midiRef.current?.dispose();
    synth.stopAll();
    metro.stopAll();
  }, [synth, metro]);

  // reset when navigating between pieces (the component stays mounted)
  useEffect(() => {
    if (sessionRef.current?.active) endPractice(false);
    stopPlayback();
    setResult(null);
    setTempo(piece?.tempo ?? 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieceId]);

  if (!piece) {
    return (
      <div className="container section">
        <h1 className="title-lg">Piece not found</h1>
        <p className="lede"><Link to="/pieces">Back to the library</Link>.</p>
      </div>
    );
  }

  const session = sessionRef.current;
  const currentGroup = practicing && session ? session.groups[session.groupIdx] : undefined;
  const nextLabel = currentGroup
    ? currentGroup.notes
        .filter((_, i) => !session!.sat[i])
        .map((n) => n.keys.join("+"))
        .join("  ·  ")
    : "";
  const stat = pieceStats[piece.id];

  return (
    <div className="piece">
      <section className="piece__hero">
        <div className="container">
          <Reveal>
            <div className="piece__crumbs">
              <Link to="/pieces">Library</Link>
              <span>/</span>
              <span>Level {piece.level} · {LEVEL_NAMES[piece.level]}</span>
            </div>
            <h1 className="title-lg">{piece.title}</h1>
            <p className="piece__composer">{piece.composer} · {piece.year}</p>
            <div className="piece__meta">
              <span className="chip">Key of {piece.keySignature}</span>
              <span className="chip">{piece.timeSignature}</span>
              <span className="chip">♩ = {piece.tempo}</span>
              {piece.skills.map((s) => <span key={s} className="chip chip--sage">{s}</span>)}
              {stat && stat.bestAccuracy > 0 && (
                <span className="chip chip--accent">Personal best {stat.bestAccuracy}%</span>
              )}
            </div>
            <p className="piece__desc">{piece.description}</p>
          </Reveal>
        </div>
      </section>

      <section className="piece__stage-wrap">
        <div className="container">
          <Reveal>
            <div className="piece__controls card">
              <div className="piece__controls-row">
                <button
                  className={`btn btn--sm ${playing ? "btn--ghost" : "btn--primary"}`}
                  onClick={playing ? stopPlayback : startPlayback}
                  disabled={practicing}
                >
                  {playing ? "■ Stop" : "▶ Play the piece"}
                </button>
                <label className="piece__tempo">
                  Tempo
                  <input
                    type="range" min={40} max={168} value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    disabled={playing || practicing}
                  />
                  <span>♩ = {tempo}</span>
                </label>
              </div>
              <hr className="rule" />
              <div className="piece__controls-row">
                <div className="piece__opt">
                  <span className="piece__opt-label">Hand</span>
                  <div className="seg">
                    {(["rh", "lh", "both"] as const).map((h) => (
                      <button
                        key={h}
                        className={`seg__btn${hand === h ? " is-active" : ""}`}
                        onClick={() => setHand(h)}
                        disabled={practicing}
                      >
                        {h === "rh" ? "Right" : h === "lh" ? "Left" : "Both"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="piece__opt">
                  <span className="piece__opt-label">Mode</span>
                  <div className="seg">
                    {(["wait", "tempo"] as const).map((m) => (
                      <button
                        key={m}
                        className={`seg__btn${practiceMode === m ? " is-active" : ""}`}
                        onClick={() => setPracticeMode(m)}
                        disabled={practicing}
                      >
                        {m === "wait" ? "Wait for me" : "With metronome"}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="piece__input-label">
                  Input
                  <select
                    value={inputMethod}
                    onChange={(e) => setInputMethod(e.target.value as InputMethod)}
                    disabled={practicing}
                  >
                    <option value="screen">On-screen / computer keys</option>
                    <option value="midi">MIDI keyboard</option>
                    <option value="mic">Microphone (acoustic piano)</option>
                  </select>
                </label>
                <button
                  className={`btn btn--sm ${practicing ? "btn--ghost" : "btn--accent"}`}
                  onClick={practicing ? () => endPractice(false) : startPractice}
                  disabled={playing}
                >
                  {practicing ? "End practice" : "Start practice"}
                </button>
              </div>
            </div>
          </Reveal>

          {micError && <div className="piece__note piece__note--warn">{micError}</div>}
          {practicing && inputMethod === "mic" && (
            <div className="piece__mic-debug card">
              <div className="piece__mic-row">
                <span className="small">Mic level</span>
                <div className="piece__mic-meter">
                  <div
                    className="piece__mic-meter-fill"
                    style={{ width: `${Math.min(100, (micDebug?.rms ?? 0) * 400)}%` }}
                  />
                </div>
              </div>
              <div className="piece__mic-row">
                <span className="small">
                  Pitch clarity {micDebug ? `${Math.round(micDebug.clarity * 100)}%` : "—"}
                  {micDebug?.freq ? ` · ${Math.round(micDebug.freq)} Hz` : ""}
                </span>
                <span className={`chip${micDebug?.accepted ? " chip--accent" : ""}`}>
                  {micDebug?.accepted ? "note accepted" : "listening"}
                </span>
              </div>
              <p className="small piece__mic-hint">
                Play a note and check this bar. If the level bar barely moves, your phone mic is
                too far away or too quiet — get closer to the piano. If the level moves but no
                note is accepted, the clarity % is too low for a confident match.
              </p>
            </div>
          )}
          {practicing && inputMethod === "midi" && midiName && (
            <div className="piece__note">Connected: {midiName}</div>
          )}
          {practicing && (
            <div className="piece__practice-bar card">
              <div className="piece__practice-info">
                <span>
                  {countIn !== null ? (
                    <>Count-in… <strong>{countIn}</strong></>
                  ) : (
                    <>Follow the highlighted notes{nextLabel && (
                      <> — next: <strong>{nextLabel}</strong></>
                    )}</>
                  )}
                </span>
                <span className="small">
                  {inputMethod === "mic"
                    ? `Listening… ${lastHeard ? `heard ${lastHeard}` : "play your piano"}`
                    : lastHeard ? `Last played: ${lastHeard}` : "Waiting for your first note"}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {result && !practicing && (
            <div className="piece__result card">
              <div>
                <span className="piece__result-score">{result.accuracy}%</span>
                <span className="piece__result-label">
                  {result.accuracy >= 90 ? "Mastered — beautifully done." :
                   result.accuracy >= 70 ? "Solid. A few more passes and it's yours." :
                   "Good work showing up. Slow it down and try again."}
                </span>
              </div>
              <div className="piece__result-detail small">
                {result.correct} right · {result.wrong} slips
                {result.timing !== undefined && <> · timing {result.timing}%</>}
              </div>
              <button className="btn btn--sm btn--accent" onClick={startPractice}>
                Practice again
              </button>
            </div>
          )}

          <div className={`piece__score${wrongFlash ? " is-wrong" : ""}`}>
            <SheetMusic
              measures={piece.measures}
              keySignature={piece.keySignature}
              timeSignature={piece.timeSignature}
              highlight={highlight}
            />
          </div>

          <div className="piece__keys">
            <div className="piano-scroll">
              <PianoKeyboard
                from={keyboardRange.from}
                to={keyboardRange.to}
                onPress={(m) => {
                  if (sessionRef.current?.active) handleInputRef.current(m);
                  else synth.playNote(m, synth.now, 0.5);
                }}
                highlight={inputMethod !== "mic" ? hintMidis : undefined}
                enableComputerKeys
              />
            </div>
            <p className="small piece__keys-hint">
              Tip: your computer keyboard works too — A S D F G… are the white keys from middle C,
              W E T Y U the black keys.
            </p>
          </div>

          <Reveal>
            <div className="piece__tips card">
              <h3 className="piece__tips-title">How to practice this piece</h3>
              <p>{piece.teachingTips}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
