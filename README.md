# Prelude

A complete piano-learning web app: a full beginner and intermediate curriculum, a sheet-music reading course, a 26-piece graded repertoire library with engraved notation, and a follow-along practice mode that listens while you play.

## Run it

```bash
npm install
npm run dev
```

## What's inside

- **Curriculum** (`/learn`) — 51 lessons across 14 modules (Beginner and Intermediate tracks): posture, rhythm, five-finger positions, dynamics, scales and chords, black keys and transposition, performance skills, pedaling, phrasing, technique building, style and interpretation, and practice strategy. Lessons can be marked complete and feed goal tracking.
- **Read Music** (`/read`) — a course on the grand staff, note names, rhythm, and key signatures, with live-rendered notation examples and a note-naming trainer (treble/bass/both, optional ledger lines) answered by letter buttons or an on-screen piano.
- **Pieces** (`/pieces`) — 26 public-domain works arranged across 5 levels (9 at level 1), from Hot Cross Buns to the Moonlight Sonata. Each piece has full grand-staff notation (VexFlow), sampled-piano playback with tempo control, teaching notes, and practice mode.
- **Practice mode** — the score highlights the current notes and advances as you play. Right hand, left hand, or hands together; "wait for me" mode or "with metronome" mode (count-in, missed-note grading, and a timing score alongside pitch accuracy). Input sources: on-screen keys, computer keyboard (A–; row), Web MIDI keyboards, or microphone pitch detection (pitchy/MPM) for acoustic pianos. 90%+ accuracy marks a piece mastered.
- **Ear training** (`/read#ear-trainer`) — interval and chord-quality recognition drills played on the sampled piano.
- **Goals** (`/goals`) — a generated "Today's practice" plan (note drill, next lesson, spaced-repetition piece pick, ear training) plus practice-minute, lesson, piece-mastery, and streak goals with automatic progress, a 14-day practice chart, and streak tracking. State persists in `localStorage`.
- **Notation** — engraved with fingering numbers, dynamic markings, and ties (held across playback and practice). Installable as a PWA; samples and assets are cached for offline practice, and routes are code-split.

## Stack

Vite + React 19 + TypeScript, VexFlow 4 (notation), Framer Motion (scroll and UI animation), Web Audio API (sampled Salamander Grand piano with synth fallback + microphone pitch detection), Web MIDI API. No backend.

## Data

Piece arrangements live in `src/data/pieces.json`; `research/validate.cjs` checks every measure sums exactly to its time signature. Curriculum content lives in `src/data/curriculum.json`.
