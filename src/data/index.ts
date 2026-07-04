import type { Curriculum, Lesson, Piece } from "../lib/types";
import piecesJson from "./pieces.json";
import curriculumJson from "./curriculum.json";

export const pieces: Piece[] = (piecesJson as { pieces: Piece[] }).pieces
  .slice()
  .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

export const curriculum: Curriculum = curriculumJson as Curriculum;

export function pieceById(id: string): Piece | undefined {
  return pieces.find((p) => p.id === id);
}

export interface LessonRef {
  lesson: Lesson;
  trackId: string;
  trackTitle: string;
  moduleTitle: string;
  moduleNumber: number;
}

export const allLessons: LessonRef[] = curriculum.tracks.flatMap((track) =>
  track.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      lesson,
      trackId: track.id,
      trackTitle: track.title,
      moduleTitle: module.title,
      moduleNumber: module.number,
    })),
  ),
);

export function lessonById(id: string): LessonRef | undefined {
  return allLessons.find((l) => l.lesson.id === id);
}

export function lessonCount(trackId?: string): number {
  return trackId
    ? allLessons.filter((l) => l.trackId === trackId).length
    : allLessons.length;
}
