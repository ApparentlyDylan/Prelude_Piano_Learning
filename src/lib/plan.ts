import { allLessons, pieces } from "../data";
import type { PieceStat } from "./types";

export interface PlanItem {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  to: string;
  done: boolean;
}

interface PlanInput {
  completedLessons: string[];
  pieceStats: Record<string, PieceStat>;
  quizLog: Record<string, number>;
  earLog: Record<string, number>;
  lessonLog: Record<string, string[]>;
  today: string;
}

/**
 * Compose today's session: a reading warm-up, one lesson, one piece chosen by
 * a light spaced-repetition rule (weakest piece you haven't seen longest), and
 * an ear-training round.
 */
export function buildPlan(input: PlanInput): PlanItem[] {
  const { completedLessons, pieceStats, quizLog, earLog, lessonLog, today } = input;

  const nextLesson = allLessons.find((l) => !completedLessons.includes(l.lesson.id));
  const lessonItem: PlanItem = nextLesson
    ? {
        id: "lesson",
        title: `Lesson: ${nextLesson.lesson.title}`,
        detail: `${nextLesson.trackTitle} · ${nextLesson.moduleTitle}`,
        minutes: nextLesson.lesson.minutes,
        to: `/learn/${nextLesson.lesson.id}`,
        done: (lessonLog[today] ?? []).length > 0,
      }
    : {
        id: "lesson",
        title: "Revisit a lesson",
        detail: "All lessons complete — review one that challenged you",
        minutes: 8,
        to: "/learn",
        done: (lessonLog[today] ?? []).length > 0,
      };

  // piece selection: unmastered but started, oldest first; else newest unstarted at a kind level
  const started = pieces
    .filter((p) => pieceStats[p.id] && pieceStats[p.id].bestAccuracy < 90)
    .sort((a, b) =>
      (pieceStats[a.id].lastPracticed ?? "").localeCompare(pieceStats[b.id].lastPracticed ?? ""),
    );
  const masteredLevels = pieces
    .filter((p) => (pieceStats[p.id]?.bestAccuracy ?? 0) >= 90)
    .map((p) => p.level);
  const comfortLevel = masteredLevels.length ? Math.max(...masteredLevels) : 1;
  const fresh = pieces.find((p) => !pieceStats[p.id] && p.level <= comfortLevel + 1);
  const maintenance = pieces
    .filter((p) => (pieceStats[p.id]?.bestAccuracy ?? 0) >= 90)
    .sort((a, b) =>
      (pieceStats[a.id].lastPracticed ?? "").localeCompare(pieceStats[b.id].lastPracticed ?? ""),
    )[0];

  const target = started[0] ?? fresh ?? maintenance ?? pieces[0];
  const targetStat = target ? pieceStats[target.id] : undefined;
  const pieceItem: PlanItem = {
    id: "piece",
    title: `Piece: ${target?.title ?? "pick any piece"}`,
    detail: started[0]
      ? `Best so far ${targetStat?.bestAccuracy}% — run practice mode until it climbs`
      : fresh === target
        ? `New at level ${target?.level} — sight-read it slowly first`
        : "Mastered a while ago — keep it warm",
    minutes: 8,
    to: target ? `/pieces/${target.id}` : "/pieces",
    done: Object.values(pieceStats).some((s) => s.lastPracticed === today),
  };

  return [
    {
      id: "drill",
      title: "Note-reading warm-up",
      detail: "15 flashcards in the note trainer",
      minutes: 3,
      to: "/read",
      done: (quizLog[today] ?? 0) >= 15,
    },
    lessonItem,
    pieceItem,
    {
      id: "ear",
      title: "Ear training",
      detail: "10 rounds of intervals or chords",
      minutes: 4,
      to: "/read#ear-trainer",
      done: (earLog[today] ?? 0) >= 10,
    },
  ];
}
