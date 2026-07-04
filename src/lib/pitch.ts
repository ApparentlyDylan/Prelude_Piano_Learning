import { PitchDetector } from "pitchy";
import { audioContext } from "./audio";
import { freqToMidi } from "./music";

/**
 * Microphone note detector built on pitchy's McLeod Pitch Method, with
 * clarity gating, median smoothing, octave-error damping, and silence-based
 * retriggering so repeated notes register on an acoustic piano.
 */
export class MicListener {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private buf = new Float32Array(2048);
  private detector = PitchDetector.forFloat32Array(2048);
  private recent: number[] = [];
  private lastReported = -1;
  private silentFrames = 0;
  private lastRms = 0;

  async start(onNote: (midi: number) => void): Promise<void> {
    const ac = audioContext();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = ac.createMediaStreamSource(this.stream);
    this.analyser = ac.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const tick = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(this.buf);

      let rms = 0;
      for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
      rms = Math.sqrt(rms / this.buf.length);

      if (rms < 0.01) {
        this.silentFrames += 1;
        if (this.silentFrames > 5) {
          this.lastReported = -1;
          this.recent = [];
        }
      } else {
        this.silentFrames = 0;
        const [freq, clarity] = this.detector.findPitch(this.buf, ac.sampleRate);
        if (clarity > 0.92 && freq > 55 && freq < 2200) {
          let midi = freqToMidi(freq);
          // damp octave flips: if we jump exactly ±12 from a stable pitch, keep the stable one
          const stable = this.recent.length >= 2 && this.recent.every((m) => m === this.recent[0])
            ? this.recent[0]
            : -1;
          if (stable > 0 && Math.abs(midi - stable) === 12 && clarity < 0.97) midi = stable;

          this.recent.push(midi);
          if (this.recent.length > 3) this.recent.shift();

          const agreed = this.recent.length === 3 && this.recent.every((m) => m === midi);
          const reattack = rms > this.lastRms * 2.2 && midi === this.lastReported;
          if ((agreed && midi !== this.lastReported) || (agreed && reattack)) {
            this.lastReported = midi;
            onNote(midi);
          }
        }
      }
      this.lastRms = rms;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }
}
