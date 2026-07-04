import { audioContext, PianoSynth } from "./audio";

/**
 * Sampled piano voice built on the public-domain Salamander Grand recordings,
 * pitch-shifted between sampled minor thirds. Falls back to the additive
 * synth until samples finish loading (or if they can't be fetched).
 */
const SAMPLE_BASE = "https://tonejs.github.io/audio/salamander/";
const SAMPLE_NOTES: Array<[file: string, midi: number]> = [
  ["A1", 33], ["C2", 36], ["Ds2", 39], ["Fs2", 42], ["A2", 45],
  ["C3", 48], ["Ds3", 51], ["Fs3", 54], ["A3", 57],
  ["C4", 60], ["Ds4", 63], ["Fs4", 66], ["A4", 69],
  ["C5", 72], ["Ds5", 75], ["Fs5", 78], ["A5", 81], ["C6", 84],
];

let sampleBuffers: Array<[midi: number, buffer: AudioBuffer]> | null = null;
let loadPromise: Promise<boolean> | null = null;

export function preloadPianoSamples(): Promise<boolean> {
  if (sampleBuffers) return Promise.resolve(true);
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const ac = audioContext();
        const entries = await Promise.all(
          SAMPLE_NOTES.map(async ([file, midi]) => {
            const res = await fetch(`${SAMPLE_BASE}${file}.mp3`);
            if (!res.ok) throw new Error(`${res.status}`);
            const buf = await ac.decodeAudioData(await res.arrayBuffer());
            return [midi, buf] as [number, AudioBuffer];
          }),
        );
        sampleBuffers = entries.sort((a, b) => a[0] - b[0]);
        return true;
      } catch {
        loadPromise = null;
        return false;
      }
    })();
  }
  return loadPromise;
}

export function samplesReady(): boolean {
  return sampleBuffers !== null;
}

function nearestSample(midi: number): [number, AudioBuffer] {
  const buffers = sampleBuffers!;
  let best = buffers[0];
  for (const entry of buffers) {
    if (Math.abs(entry[0] - midi) < Math.abs(best[0] - midi)) best = entry;
  }
  return best;
}

export class Piano {
  private ac: AudioContext;
  private bus: GainNode;
  private fallback: PianoSynth;

  constructor() {
    this.ac = audioContext();
    this.bus = this.ac.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.ac.destination);
    this.fallback = new PianoSynth();
    void preloadPianoSamples();
  }

  get now(): number {
    return this.ac.currentTime;
  }

  playNote(midi: number, when: number, durationSec: number, velocity = 0.9): void {
    if (!sampleBuffers) {
      this.fallback.playNote(midi, when, durationSec, velocity);
      return;
    }
    const [sampleMidi, buffer] = nearestSample(midi);
    const t = Math.max(when, this.ac.currentTime);
    const hold = Math.max(durationSec, 0.25);

    const src = this.ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = Math.pow(2, (midi - sampleMidi) / 12);

    const gain = this.ac.createGain();
    gain.gain.setValueAtTime(velocity, t);
    gain.gain.setValueAtTime(velocity, t + hold);
    gain.gain.linearRampToValueAtTime(0.0001, t + hold + 0.3);

    src.connect(gain);
    gain.connect(this.bus);
    src.start(t);
    src.stop(t + hold + 0.35);
  }

  stopAll(): void {
    this.fallback.stopAll();
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + 0.08);
    const old = this.bus;
    setTimeout(() => old.disconnect(), 150);
    this.bus = this.ac.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.ac.destination);
  }
}

/** Wood-block style click track scheduled through its own cuttable bus. */
export class Metronome {
  private ac: AudioContext;
  private bus: GainNode;

  constructor() {
    this.ac = audioContext();
    this.bus = this.ac.createGain();
    this.bus.gain.value = 0.55;
    this.bus.connect(this.ac.destination);
  }

  click(when: number, accent: boolean): void {
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1900 : 1300;
    gain.gain.setValueAtTime(accent ? 0.5 : 0.3, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
    osc.connect(gain);
    gain.connect(this.bus);
    osc.start(when);
    osc.stop(when + 0.06);
  }

  /** Schedule clicks for `totalBeats` beats starting at `t0`, accenting each measure. */
  schedule(t0: number, totalBeats: number, secPerBeat: number, beatsPerMeasure: number): void {
    for (let b = 0; b < totalBeats; b++) {
      this.click(t0 + b * secPerBeat, b % beatsPerMeasure === 0);
    }
  }

  stopAll(): void {
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + 0.04);
    const old = this.bus;
    setTimeout(() => old.disconnect(), 100);
    this.bus = this.ac.createGain();
    this.bus.gain.value = 0.55;
    this.bus.connect(this.ac.destination);
  }
}
