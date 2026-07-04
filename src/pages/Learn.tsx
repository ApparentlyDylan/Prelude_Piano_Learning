import { useState } from "react";
import { Link } from "react-router-dom";
import { Reveal, RevealItem, RevealStagger } from "../components/Reveal";
import { curriculum } from "../data";
import { useStore } from "../lib/store";
import "./learn.css";

export function Learn() {
  const [trackId, setTrackId] = useState(curriculum.tracks[0]?.id ?? "beginner");
  const { completedLessons } = useStore();
  const track = curriculum.tracks.find((t) => t.id === trackId) ?? curriculum.tracks[0];

  const trackLessonIds = track.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const doneInTrack = trackLessonIds.filter((id) => completedLessons.includes(id)).length;
  const pct = trackLessonIds.length
    ? Math.round((doneInTrack / trackLessonIds.length) * 100)
    : 0;

  return (
    <div className="learn">
      <section className="learn__hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Curriculum</span>
            <h1 className="title-lg learn__title">Everything a pianist needs to know, in order.</h1>
            <p className="lede">
              Work through the modules top to bottom, or dip into what you need.
              Mark lessons complete to build your streak and feed your goals.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="learn__tracks">
              {curriculum.tracks.map((t) => (
                <button
                  key={t.id}
                  className={`learn__track-btn${t.id === track.id ? " is-active" : ""}`}
                  onClick={() => setTrackId(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="learn__progress card">
              <div className="learn__progress-text">
                <strong>{track.title} track</strong>
                <span>{doneInTrack} of {trackLessonIds.length} lessons complete</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="learn__body">
        <div className="container">
          {track.modules.map((module, mi) => (
            <div key={module.id} className="learn__module">
              <Reveal>
                <div className="learn__module-head">
                  <span className="learn__module-num">
                    {String(module.number).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="title-md">{module.title}</h2>
                    <p className="learn__module-summary">{module.summary}</p>
                  </div>
                </div>
              </Reveal>
              <RevealStagger className="learn__lessons">
                {module.lessons.map((lesson) => {
                  const done = completedLessons.includes(lesson.id);
                  return (
                    <RevealItem key={lesson.id}>
                      <Link
                        to={`/learn/${lesson.id}`}
                        className={`learn__lesson card card--hover${done ? " is-done" : ""}`}
                      >
                        <span className={`learn__check${done ? " is-done" : ""}`} aria-hidden>
                          {done ? "✓" : ""}
                        </span>
                        <div className="learn__lesson-main">
                          <span className="learn__lesson-title">{lesson.title}</span>
                          <span className="learn__lesson-summary">{lesson.summary}</span>
                        </div>
                        <span className="chip">{lesson.minutes} min</span>
                      </Link>
                    </RevealItem>
                  );
                })}
              </RevealStagger>
              {mi < track.modules.length - 1 && <hr className="rule learn__rule" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
