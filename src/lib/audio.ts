import { midiToFreq } from "./music";

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/**
 * Lightweight additive piano voice: layered detuned oscillators with an
 * exponential decay envelope and key-tracked lowpass, routed through a
 * session bus so playback can be cut instantly.
 */
export class PianoSynth {
  private bus: GainNode;
  private ac: AudioContext;

  constructor() {
    this.ac = audioContext();
    this.bus = this.ac.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.ac.destination);
  }

  get now(): number {
    return this.ac.currentTime;
  }

  playNote(midi: number, when: number, durationSec: number, velocity = 0.9): void {
    const freq = midiToFreq(midi);
    const t = Math.max(when, this.ac.currentTime);
    const stop = t + Math.max(durationSec * 1.05, 0.28);

    const gain = this.ac.createGain();
    const filter = this.ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = Math.min(freq * 7 + 800, 9000);
    filter.Q.value = 0.4;

    gain.connect(filter);
    filter.connect(this.bus);

    const peak = 0.22 * velocity * (midi > 72 ? 0.85 : 1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(peak * 0.35, t + Math.min(0.35, durationSec * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);

    const partials: Array<[number, number, OscillatorType]> = [
      [1, 1, "triangle"],
      [1.001, 0.4, "sine"],
      [2, 0.18, "sine"],
      [3, 0.07, "sine"],
    ];
    for (const [ratio, level, type] of partials) {
      const osc = this.ac.createOscillator();
      const og = this.ac.createGain();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      og.gain.value = level;
      osc.connect(og);
      og.connect(gain);
      osc.start(t);
      osc.stop(stop + 0.05);
    }
  }

  /** Immediately silence everything routed through this synth. */
  stopAll(): void {
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + 0.06);
    const old = this.bus;
    setTimeout(() => old.disconnect(), 120);
    this.bus = this.ac.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.ac.destination);
  }
}
