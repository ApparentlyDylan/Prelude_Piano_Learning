import { Link, useNavigate, useParams } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { allLessons, lessonById } from "../data";
import { useStore } from "../lib/store";
import "./learn.css";

export function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { completedLessons, toggleLesson } = useStore();

  const ref = lessonId ? lessonById(lessonId) : undefined;
  if (!ref) {
    return (
      <div className="container section">
        <h1 className="title-lg">Lesson not found</h1>
        <p className="lede">This lesson may have moved. <Link to="/learn">Back to the curriculum</Link>.</p>
      </div>
    );
  }

  const { lesson, trackTitle, moduleTitle, moduleNumber } = ref;
  const done = completedLessons.includes(lesson.id);
  const idx = allLessons.findIndex((l) => l.lesson.id === lesson.id);
  const prev = idx > 0 ? allLessons[idx - 1] : undefined;
  const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : undefined;

  return (
    <div className="lesson">
      <section className="lesson__hero">
        <div className="container--narrow">
          <Reveal>
            <div className="lesson__crumbs">
              <Link to="/learn">Curriculum</Link>
              <span>/</span>
              <span>{trackTitle} · Module {moduleNumber}: {moduleTitle}</span>
            </div>
            <h1 className="title-lg">{lesson.title}</h1>
            <div className="lesson__meta">
              <span className="chip">{lesson.minutes} min read</span>
              {done && <span className="chip chip--sage">Completed</span>}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lesson__body">
        <div className="container--narrow">
          {lesson.sections.map((s, i) => (
            <Reveal key={i} delay={Math.min(i * 0.05, 0.15)}>
              <div className="lesson__section">
                <h2 className="title-md">{s.heading}</h2>
                <p>{s.body}</p>
                {s.list && (
                  <ul className="lesson__list">
                    {s.list.map((item, j) => <li key={j}>{item}</li>)}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}

          {lesson.keyTerms.length > 0 && (
            <Reveal>
              <div className="lesson__terms card">
                <h3 className="lesson__aside-title">Key terms</h3>
                <dl>
                  {lesson.keyTerms.map((t) => (
                    <div key={t.term} className="lesson__term">
                      <dt>{t.term}</dt>
                      <dd>{t.definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          )}

          {lesson.exercises.length > 0 && (
            <Reveal>
              <div className="lesson__exercises card">
                <h3 className="lesson__aside-title">At the piano</h3>
                <ol>
                  {lesson.exercises.map((e, i) => <li key={i}>{e}</li>)}
                </ol>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="lesson__actions">
              <button
                className={`btn ${done ? "btn--ghost" : "btn--accent"}`}
                onClick={() => toggleLesson(lesson.id)}
              >
                {done ? "Mark as not done" : "Mark lesson complete"}
              </button>
              {next && !done && (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    toggleLesson(lesson.id);
                    navigate(`/learn/${next.lesson.id}`);
                  }}
                >
                  Complete & continue →
                </button>
              )}
            </div>
            <div className="lesson__nav">
              {prev ? (
                <Link to={`/learn/${prev.lesson.id}`} className="lesson__nav-link">
                  ← {prev.lesson.title}
                </Link>
              ) : <span />}
              {next ? (
                <Link to={`/learn/${next.lesson.id}`} className="lesson__nav-link lesson__nav-link--next">
                  {next.lesson.title} →
                </Link>
              ) : <span />}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
