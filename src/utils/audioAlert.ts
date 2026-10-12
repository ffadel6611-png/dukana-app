/**
 * Audio Alert Utility using Web Audio API
 * Generates a gentle, smooth 2-tone chime for incoming chat messages & notifications.
 * Works completely offline without needing external audio asset downloads.
 */

let lastChimeTime = 0;

export function playChimeSound(volume: number = 0.15) {
  // Prevent chime spamming (at least 2 seconds between chimes)
  const nowMs = Date.now();
  if (nowMs - lastChimeTime < 1800) {
    return;
  }
  lastChimeTime = nowMs;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, t);

    gain1.gain.setValueAtTime(volume * 0.9, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.36);

    // Tone 2: A5 (880 Hz) - slightly delayed for a melodic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t + 0.12);

    gain2.gain.setValueAtTime(volume, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(t + 0.12);
    osc2.stop(t + 0.56);
  } catch (err) {
    // Gracefully ignore browsers blocking audio before initial user gesture
  }
}
