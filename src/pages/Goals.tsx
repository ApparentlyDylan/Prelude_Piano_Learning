import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Reveal, RevealItem, RevealStagger } from "../components/Reveal";
import { useStore, todayISO } from "../lib/store";
import { lessonCount, pieces } from "../data";
import { buildPlan } from "../lib/plan";
import type { Goal } from "../lib/types";
import "./goals.css";

const GOAL_TYPES: Array<{ value: Goal["type"]; label: string; unit: string }> = [
  { value: "minutes", label: "Practice minutes this week", unit: "min" },
  { value: "lessons", label: "Curriculum lessons completed", unit: "lessons" },
  { value: "pieces", label: "Pieces mastered (90%+)", unit: "pieces" },
  { value: "streak", label: "Practice streak", unit: "days" },
];

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

export function Goals() {
  const store = useStore();
  const [type, setType] = useState<Goal["type"]>("minutes");
  const [target, setTarget] = useState(60);

  const weekMinutes = useMemo(() => {
    return lastNDays(7).reduce((sum, day) => sum + (store.practiceLog[day] ?? 0), 0);
  }, [store.practiceLog]);

  const progressFor = (g: Goal): { value: number; pct: number; caption: string } => {
    let value = 0;
    switch (g.type) {
      case "minutes": value = Math.round(weekMinutes); break;
      case "lessons": value = store.completedLessons.length; break;
      case "pieces": value = store.piecesMastered; break;
      case "streak": value = store.streak; break;
    }
    const pct = Math.min(100, Math.round((value / g.target) * 100));
    const unit = GOAL_TYPES.find((t) => t.value === g.type)?.unit ?? "";
    return { value, pct, caption: `${value} of ${g.target} ${unit}` };
  };

  const chartDays = lastNDays(14);
  const maxMinutes = Math.max(10, ...chartDays.map((d) => store.practiceLog[d] ?? 0));

  const plan = useMemo(
    () =>
      buildPlan({
        completedLessons: store.completedLessons,
        pieceStats: store.pieceStats,
        quizLog: store.quizLog,
        earLog: store.earLog,
        lessonLog: store.lessonLog,
        today: todayISO(),
      }),
    [store.completedLessons, store.pieceStats, store.quizLog, store.earLog, store.lessonLog],
  );
  const planDone = plan.filter((p) => p.done).length;
  const planMinutes = plan.reduce((a, p) => a + p.minutes, 0);

  const addGoal = () => {
    const t = GOAL_TYPES.find((x) => x.value === type)!;
    store.addGoal({ type, target: Math.max(1, target), title: t.label });
  };

  return (
    <div className="goals">
      <section className="goals__hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow">Goals & momentum</span>
            <h1 className="title-lg goals__title">Progress you can point to.</h1>
            <p className="lede">
              Lessons you finish, pieces you practice, and minutes at the keys all
              land here automatically. Set a goal and let the numbers keep you honest.
            </p>
          </Reveal>

          <RevealStagger className="goals__stats">
            {[
              { n: store.streak, l: store.streak === 1 ? "day streak" : "day streak", accent: true },
              { n: store.totalMinutes, l: "minutes practiced" },
              { n: store.completedLessons.length, l: `of ${lessonCount()} lessons done` },
              { n: store.piecesMastered, l: `of ${pieces.length} pieces mastered` },
            ].map((s) => (
              <RevealItem key={s.l} className={`goals__stat card${s.accent ? " goals__stat--accent" : ""}`}>
                <span className="goals__stat-n">{s.n}</span>
                <span className="goals__stat-l">{s.l}</span>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </section>

      <section className="goals__body">
        <div className="container">
          <Reveal>
            <div className="plan card">
              <div className="plan__head">
                <div>
                  <h2 className="title-md">Today's practice</h2>
                  <p className="plan__sub">
                    About {planMinutes} minutes, chosen from where you are — {planDone} of {plan.length} done.
                  </p>
                </div>
                <div className="plan__ring" aria-hidden>
                  {planDone}/{plan.length}
                </div>
              </div>
              <div className="plan__items">
                {plan.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className={`plan__item${item.done ? " is-done" : ""}`}
                  >
                    <span className={`plan__check${item.done ? " is-done" : ""}`}>
                      {item.done ? "✓" : ""}
                    </span>
                    <span className="plan__item-main">
                      <span className="plan__item-title">{item.title}</span>
                      <span className="plan__item-detail">{item.detail}</span>
                    </span>
                    <span className="chip">{item.minutes} min</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
        <div className="container goals__grid">
          <div>
            <Reveal>
              <h2 className="title-md">Your goals</h2>
              <div className="goals__add card">
                <label>
                  I want to reach
                  <select value={type} onChange={(e) => setType(e.target.value as Goal["type"])}>
                    {GOAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Target
                  <input
                    type="number" min={1} max={10000} value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                  />
                </label>
                <button className="btn btn--accent btn--sm" onClick={addGoal}>Add goal</button>
              </div>
            </Reveal>

            {store.goals.length === 0 ? (
              <Reveal>
                <p className="goals__empty">
                  No goals yet. Sixty minutes a week is a kind place to start.
                </p>
              </Reveal>
            ) : (
              <div className="goals__list">
                {store.goals.map((g) => {
                  const p = progressFor(g);
                  const met = p.pct >= 100;
                  return (
                    <motion.div
                      key={g.id}
                      className={`goals__goal card${met ? " is-met" : ""}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="goals__goal-head">
                        <span className="goals__goal-title">
                          {met && <span className="goals__goal-check">✓ </span>}
                          {g.title}: {g.target}
                        </span>
                        <button
                          className="goals__goal-remove"
                          onClick={() => store.removeGoal(g.id)}
                          aria-label="Remove goal"
                        >
                          ×
                        </button>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="small">{met ? "Goal met — set a taller one." : p.caption}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Reveal delay={0.1}>
              <h2 className="title-md">Last 14 days</h2>
              <div className="goals__chart card">
                <div className="goals__bars">
                  {chartDays.map((day) => {
                    const min = store.practiceLog[day] ?? 0;
                    const h = Math.max(min > 0 ? 8 : 3, (min / maxMinutes) * 100);
                    const isToday = day === todayISO();
                    return (
                      <div key={day} className="goals__bar-col" title={`${day}: ${Math.round(min)} min`}>
                        <motion.span
                          className={`goals__bar${min > 0 ? " has-data" : ""}${isToday ? " is-today" : ""}`}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <span className="goals__bar-label">{day.slice(8)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="small goals__chart-caption">
                  Minutes of practice per day. {store.activeDays} active {store.activeDays === 1 ? "day" : "days"} total.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="goals__nudge card">
                <h3>How goals fill up</h3>
                <ul>
                  <li>Finishing a lesson in the curriculum counts toward lesson goals and your streak.</li>
                  <li>Practice mode on any piece logs your minutes and best accuracy.</li>
                  <li>Score 90% or better in practice mode to mark a piece mastered.</li>
                  <li>Any activity today keeps the streak alive — even one drill in the note trainer.</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
