export interface NoteEvent {
  keys?: string[];
  rest?: boolean;
  d: "w" | "h" | "q" | "8" | "16";
  dots?: number;
  /** fingering number 1-5, shown above (RH) or below (LH) the note */
  f?: number;
  /** dynamic marking rendered at this note */
  dyn?: "pp" | "p" | "mp" | "mf" | "f" | "ff";
  /** tied to the next note of the same hand (identical keys) */
  tie?: boolean;
}

export interface Measure {
  rh: NoteEvent[];
  lh: NoteEvent[];
}

export interface Piece {
  id: string;
  title: string;
  composer: string;
  year: string;
  level: number;
  keySignature: string;
  timeSignature: string;
  tempo: number;
  description: string;
  skills: string[];
  teachingTips: string;
  measures: Measure[];
}

export interface LessonSection {
  heading: string;
  body: string;
  list?: string[];
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  sections: LessonSection[];
  keyTerms: KeyTerm[];
  exercises: string[];
}

export interface Module {
  id: string;
  number: number;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export interface Track {
  id: string;
  title: string;
  subtitle: string;
  modules: Module[];
}

export interface Curriculum {
  tracks: Track[];
}

export interface PieceStat {
  bestAccuracy: number;
  timesPracticed: number;
  lastPracticed?: string;
}

export interface Goal {
  id: string;
  type: "lessons" | "pieces" | "minutes" | "streak";
  target: number;
  title: string;
  createdAt: string;
}
