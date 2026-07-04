import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Goal, PieceStat } from "./types";

interface DrillStats {
  answered: number;
  correct: number;
  bestStreak: number;
}

interface AppState {
  completedLessons: string[];
  pieceStats: Record<string, PieceStat>;
  practiceLog: Record<string, number>; // ISO date -> minutes
  quiz: DrillStats;
  ear: DrillStats;
  quizLog: Record<string, number>; // ISO date -> answers that day
  earLog: Record<string, number>;
  lessonLog: Record<string, string[]>; // ISO date -> lesson ids completed that day
  goals: Goal[];
}

const EMPTY: AppState = {
  completedLessons: [],
  pieceStats: {},
  practiceLog: {},
  quiz: { answered: 0, correct: 0, bestStreak: 0 },
  ear: { answered: 0, correct: 0, bestStreak: 0 },
  quizLog: {},
  earLog: {},
  lessonLog: {},
  goals: [],
};

const KEY = "prelude-state-v1";

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    return EMPTY;
  }
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface StoreValue extends AppState {
  toggleLesson: (id: string) => void;
  logActivity: (minutes: number) => void;
  recordPractice: (pieceId: string, accuracy: number) => void;
  logQuiz: (correct: boolean, streak: number) => void;
  logEar: (correct: boolean, streak: number) => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  removeGoal: (id: string) => void;
  streak: number;
  totalMinutes: number;
  piecesMastered: number;
  activeDays: number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const toggleLesson = useCallback((id: string) => {
    setState((s) => {
      const done = s.completedLessons.includes(id);
      const completedLessons = done
        ? s.completedLessons.filter((l) => l !== id)
        : [...s.completedLessons, id];
      const day = todayISO();
      return {
        ...s,
        completedLessons,
        practiceLog: done
          ? s.practiceLog
          : { ...s.practiceLog, [day]: (s.practiceLog[day] ?? 0) + 0.01 },
        lessonLog: done
          ? s.lessonLog
          : { ...s.lessonLog, [day]: [...(s.lessonLog[day] ?? []), id] },
      };
    });
  }, []);

  const logActivity = useCallback((minutes: number) => {
    setState((s) => ({
      ...s,
      practiceLog: { ...s.practiceLog, [todayISO()]: (s.practiceLog[todayISO()] ?? 0) + minutes },
    }));
  }, []);

  const recordPractice = useCallback((pieceId: string, accuracy: number) => {
    setState((s) => {
      const prev = s.pieceStats[pieceId] ?? { bestAccuracy: 0, timesPracticed: 0 };
      return {
        ...s,
        pieceStats: {
          ...s.pieceStats,
          [pieceId]: {
            bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
            timesPracticed: prev.timesPracticed + 1,
            lastPracticed: todayISO(),
          },
        },
      };
    });
  }, []);

  const makeDrillLogger = (kind: "quiz" | "ear") =>
    (correct: boolean, streak: number) => {
      setState((s) => {
        const day = todayISO();
        const stats = s[kind];
        const log = kind === "quiz" ? s.quizLog : s.earLog;
        return {
          ...s,
          [kind]: {
            answered: stats.answered + 1,
            correct: stats.correct + (correct ? 1 : 0),
            bestStreak: Math.max(stats.bestStreak, streak),
          },
          [kind === "quiz" ? "quizLog" : "earLog"]: { ...log, [day]: (log[day] ?? 0) + 1 },
          practiceLog: { ...s.practiceLog, [day]: (s.practiceLog[day] ?? 0) + 0.01 },
        };
      });
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logQuiz = useCallback(makeDrillLogger("quiz"), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logEar = useCallback(makeDrillLogger("ear"), []);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "createdAt">) => {
    setState((s) => ({
      ...s,
      goals: [
        ...s.goals,
        { ...goal, id: `g${Date.now()}`, createdAt: new Date().toISOString() },
      ],
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }, []);

  const derived = useMemo(() => {
    let streak = 0;
    for (let i = 0; ; i++) {
      const day = shiftISO(-i);
      if ((state.practiceLog[day] ?? 0) > 0) streak += 1;
      else if (i === 0) continue; // today can still be pending
      else break;
      if (i > 3650) break;
    }
    const totalMinutes = Math.round(
      Object.values(state.practiceLog).reduce((a, b) => a + b, 0),
    );
    const piecesMastered = Object.values(state.pieceStats).filter(
      (p) => p.bestAccuracy >= 90,
    ).length;
    const activeDays = Object.values(state.practiceLog).filter((m) => m > 0).length;
    return { streak, totalMinutes, piecesMastered, activeDays };
  }, [state.practiceLog, state.pieceStats]);

  const value: StoreValue = {
    ...state,
    ...derived,
    toggleLesson,
    logActivity,
    recordPractice,
    logQuiz,
    logEar,
    addGoal,
    removeGoal,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
