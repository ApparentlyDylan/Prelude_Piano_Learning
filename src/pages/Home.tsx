import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Reveal, RevealItem, RevealStagger } from "../components/Reveal";
import { pieces, curriculum, lessonCount } from "../data";
import { LEVEL_NAMES } from "../lib/music";
import "./home.css";

const HERO_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const BLACK_AFTER = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);

function LevelDots({ level }: { level: number }) {
  return (
    <span className="level-dots" aria-label={`Level ${level}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={n <= level ? "on" : ""} />
      ))}
    </span>
  );
}

export function Home() {
  const { scrollY } = useScroll();
  const keysY = useTransform(scrollY, [0, 700], [0, 110]);
  const glowY = useTransform(scrollY, [0, 700], [0, -60]);

  const previewPieces = [
    pieces.find((p) => p.level === 1),
    pieces.find((p) => p.level === 3) ?? pieces[Math.min(1, pieces.length - 1)],
    pieces.find((p) => p.level >= 4) ?? pieces[pieces.length - 1],
  ].filter((p, i, arr) => p && arr.indexOf(p) === i) as typeof pieces;

  const beginnerModules = curriculum.tracks[0]?.modules ?? [];

  return (
    <div className="home">
      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <motion.div className="hero__glow" style={{ y: glowY }} aria-hidden />
        <div className="container hero__grid">
          <div className="hero__copy">
            <motion.span
              className="eyebrow"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              A complete piano education
            </motion.span>
            <motion.h1
              className="display"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              Learn piano the way
              <br />
              <em>music deserves.</em>
            </motion.h1>
            <motion.p
              className="lede"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              A full curriculum from your first middle C to expressive, confident
              playing — with real repertoire, a sheet-music reading course, and a
              practice companion that listens while you play.
            </motion.p>
            <motion.div
              className="hero__actions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to="/learn" className="btn btn--primary">Begin the curriculum</Link>
              <Link to="/pieces" className="btn btn--ghost">Browse the pieces</Link>
            </motion.div>
          </div>

          <motion.div className="hero__art" style={{ y: keysY }} aria-hidden>
            <div className="hero__keys">
              {HERO_KEYS.map((i) => (
                <motion.div
                  key={i}
                  className="hero__key"
                  initial={{ y: 90, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.35 + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                >
                  {BLACK_AFTER.has(i) && i !== HERO_KEYS.length - 1 && (
                    <span className="hero__black-key" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="container hero__stats">
          {[
            { n: String(pieces.length), l: "pieces, all levels" },
            { n: String(lessonCount()), l: "curriculum lessons" },
            { n: "5", l: "difficulty levels" },
            { n: "4", l: "ways to play along" },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08}>
              <div className="hero__stat">
                <span className="hero__stat-n">{s.n}</span>
                <span className="hero__stat-l">{s.l}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- method ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="eyebrow">The method</span>
            <h2 className="title-lg home__heading">
              Three disciplines,
              <br />
              one musician.
            </h2>
          </Reveal>
          <RevealStagger className="method__grid">
            {[
              {
                k: "01",
                t: "Understand",
                d: "A structured curriculum of bite-size lessons — posture, rhythm, harmony, pedaling — written like a great private teacher explains things, not like a textbook.",
                to: "/learn",
                link: "Explore the curriculum",
              },
              {
                k: "02",
                t: "Read",
                d: "A dedicated course on reading notation, from the grand staff to key signatures, with a note-naming trainer that turns sight-reading into a reflex.",
                to: "/read",
                link: "Learn to read music",
              },
              {
                k: "03",
                t: "Play",
                d: "Real repertoire at every level. Watch the score light up as you play — Prelude follows along through your microphone, MIDI keyboard, or on-screen keys.",
                to: "/pieces",
                link: "Open the piece library",
              },
            ].map((c) => (
              <RevealItem key={c.k} className="method__card card card--hover">
                <span className="method__num">{c.k}</span>
                <h3 className="title-md">{c.t}</h3>
                <p>{c.d}</p>
                <Link to={c.to} className="method__link">{c.link} →</Link>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ---------------- follow along (dark) ---------------- */}
      <section className="section section--dark follow">
        <div className="container follow__grid">
          <Reveal className="follow__copy">
            <span className="eyebrow">Follow-along practice</span>
            <h2 className="title-lg">The score listens back.</h2>
            <p className="follow__lede">
              Start practice mode on any piece and the notation highlights the note
              you're on. Play it — on your real piano through the microphone, on a
              MIDI keyboard, or right on the screen — and the score advances with
              you, note by note, and grades your accuracy at the end.
            </p>
            <ul className="follow__list">
              <li>Microphone pitch detection for acoustic pianos</li>
              <li>MIDI keyboard support, plug and play</li>
              <li>On-screen and computer-keyboard keys built in</li>
              <li>Accuracy scoring that feeds your goals</li>
            </ul>
            <Link to="/pieces" className="btn btn--light">Try practice mode</Link>
          </Reveal>
          <Reveal delay={0.15} className="follow__visual">
            <div className="follow__bars" aria-hidden>
              {[38, 64, 46, 78, 55, 90, 60, 72, 44, 82, 52, 66].map((h, i) => (
                <motion.span
                  key={i}
                  initial={{ scaleY: 0.2 }}
                  whileInView={{ scaleY: [0.3, h / 100, 0.45, (h + 12) / 100, h / 100] }}
                  viewport={{ once: false, margin: "-80px" }}
                  transition={{ duration: 2.6, repeat: Infinity, repeatType: "mirror", delay: i * 0.12, ease: "easeInOut" }}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="follow__caption">Listening… E4 detected</div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- curriculum preview ---------------- */}
      <section className="section section--alt">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Curriculum</span>
            <h2 className="title-lg home__heading">From first touch to fluent hands.</h2>
          </Reveal>
          <RevealStagger className="curr__grid">
            {beginnerModules.slice(0, 3).map((m) => (
              <RevealItem key={m.id} className="curr__card card card--hover">
                <span className="chip chip--accent">Module {m.number}</span>
                <h3 className="title-md">{m.title}</h3>
                <p>{m.summary}</p>
                <span className="small">{m.lessons.length} lessons</span>
              </RevealItem>
            ))}
          </RevealStagger>
          <Reveal delay={0.1}>
            <div className="home__center">
              <Link to="/learn" className="btn btn--primary">See the full curriculum</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- pieces preview ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Repertoire</span>
            <h2 className="title-lg home__heading">Real music, from day one.</h2>
          </Reveal>
          <RevealStagger className="pieces-preview__grid">
            {previewPieces.map((p) => (
              <RevealItem key={p.id}>
                <Link to={`/pieces/${p.id}`} className="pieces-preview__card card card--hover">
                  <div className="pieces-preview__top">
                    <LevelDots level={p.level} />
                    <span className="small">{LEVEL_NAMES[p.level]}</span>
                  </div>
                  <h3 className="title-md">{p.title}</h3>
                  <p className="small">{p.composer}</p>
                  <div className="pieces-preview__skills">
                    {p.skills.slice(0, 2).map((s) => (
                      <span key={s} className="chip">{s}</span>
                    ))}
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealStagger>
          <Reveal delay={0.1}>
            <div className="home__center">
              <Link to="/pieces" className="btn btn--ghost">
                All {pieces.length} pieces →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- goals band ---------------- */}
      <section className="section section--alt">
        <div className="container goals-band">
          <Reveal className="goals-band__copy">
            <span className="eyebrow">Goals & momentum</span>
            <h2 className="title-lg">Small promises, kept daily.</h2>
            <p className="lede">
              Set practice goals — minutes a week, lessons finished, pieces
              mastered — and Prelude keeps score, tracks your streak, and shows
              your practice history at a glance.
            </p>
            <Link to="/goals" className="btn btn--accent">Set your first goal</Link>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="goals-band__demo card">
              <div className="goals-band__row">
                <span>Practice 60 minutes this week</span>
                <span className="goals-band__pct">72%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: "72%" }} /></div>
              <div className="goals-band__row">
                <span>Master 3 level-one pieces</span>
                <span className="goals-band__pct">2 of 3</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: "66%" }} /></div>
              <div className="goals-band__row">
                <span>7-day practice streak</span>
                <span className="goals-band__pct">day 5</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: "71%" }} /></div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
