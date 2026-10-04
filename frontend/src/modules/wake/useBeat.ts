import { useEffect } from "react";

const BPM = 120;

/**
 * A simple upbeat rhythm (kick + hi-hat) made with Web Audio, so there's music
 * to move to without any audio files. Starts only after a tap (browsers require it).
 */
export function useBeat(playing: boolean): void {
  useEffect(() => {
    if (!playing) return;
    const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const beat = 60 / BPM;
    let next = ctx.currentTime + 0.05;
    let step = 0;

    const kick = (t: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    };

    const hat = (t: number) => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      noise.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.value = 7000;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(t);
    };

    const timer = window.setInterval(() => {
      while (next < ctx.currentTime + 0.2) {
        if (step % 2 === 0) kick(next);
        hat(next + beat / 2);
        next += beat;
        step++;
      }
    }, 50);

    return () => {
      window.clearInterval(timer);
      void ctx.close();
    };
  }, [playing]);
}
