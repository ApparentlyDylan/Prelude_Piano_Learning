export interface MidiConnection {
  supported: boolean;
  deviceName: string | null;
  dispose: () => void;
}

/** Listen for note-on events from any connected MIDI keyboard. */
export async function connectMidi(onNote: (midi: number) => void): Promise<MidiConnection> {
  if (!("requestMIDIAccess" in navigator)) {
    return { supported: false, deviceName: null, dispose: () => {} };
  }
  try {
    const access = await navigator.requestMIDIAccess();
    let deviceName: string | null = null;
    const handler = (e: MIDIMessageEvent) => {
      const data = e.data;
      if (!data || data.length < 3) return;
      const status = data[0] & 0xf0;
      if (status === 0x90 && data[2] > 0) onNote(data[1]);
    };
    const attach = () => {
      access.inputs.forEach((input) => {
        input.onmidimessage = handler;
        deviceName = input.name ?? "MIDI keyboard";
      });
    };
    attach();
    access.onstatechange = attach;
    return {
      supported: true,
      deviceName,
      dispose: () => {
        access.onstatechange = null;
        access.inputs.forEach((input) => { input.onmidimessage = null; });
      },
    };
  } catch {
    return { supported: false, deviceName: null, dispose: () => {} };
  }
}
