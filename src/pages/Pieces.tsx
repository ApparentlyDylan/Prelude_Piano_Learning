import { useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, RevealItem, RevealStagger } from "../components/Reveal";
import { pieces } from "../data";
import { LEVEL_NAMES } from "../lib/music";
import { useStore } from "../lib/store";
import "./pieces.css";

function LevelDots({ level }: { level: number }) {
  return (
    <span className="level-dots" aria-label={`Level ${level}`}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= level ? "on" : ""} />)}
    </span>
  );
}

export function Pieces() {
  const [level, setLevel] = useState(0);
  const { pieceStats } = useStore();
  const filtered = level === 0 ? pieces : pieces.filter((p) => p.level === level);

  return (
    <div className="pieces">
      <section className="pieces__hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow">The library</span>
            <h1 className="title-lg pieces__title">
              {pieces.length} pieces, five levels, zero filler.
            </h1>
            <p className="lede">
              Every piece is a real public-domain work arranged for its level, with
              full notation, playback, and a practice mode that follows your playing.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="pieces__filters">
              <button
                className={`pieces__filter${level === 0 ? " is-active" : ""}`}
                onClick={() => setLevel(0)}
              >
                All
              </button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`pieces__filter${level === n ? " is-active" : ""}`}
                  onClick={() => setLevel(n)}
                >
                  Level {n}
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pieces__body">
        <div className="container">
          <RevealStagger className="pieces__grid" key={level}>
            {filtered.map((p) => {
              const stat = pieceStats[p.id];
              return (
                <RevealItem key={p.id}>
                  <Link to={`/pieces/${p.id}`} className="piece-card card card--hover">
                    <div className="piece-card__top">
                      <LevelDots level={p.level} />
                      <span className="small">{LEVEL_NAMES[p.level]}</span>
                    </div>
                    <h2 className="piece-card__title">{p.title}</h2>
                    <span className="piece-card__composer">{p.composer}</span>
                    <p className="piece-card__desc">{p.description}</p>
                    <div className="piece-card__skills">
                      {p.skills.slice(0, 3).map((s) => (
                        <span key={s} className="chip">{s}</span>
                      ))}
                    </div>
                    <div className="piece-card__foot">
                      <span className="small">
                        {p.measures.length} measures · key of {p.keySignature} · {p.timeSignature}
                      </span>
                      {stat && stat.bestAccuracy > 0 && (
                        <span className={`chip ${stat.bestAccuracy >= 90 ? "chip--sage" : "chip--accent"}`}>
                          {stat.bestAccuracy >= 90 ? "Mastered" : `Best ${stat.bestAccuracy}%`}
                        </span>
                      )}
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealStagger>
        </div>
      </section>
    </div>
  );
}
