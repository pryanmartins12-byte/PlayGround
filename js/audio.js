/* Tiny procedural battlefield audio engine. No external assets or network. */
export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.72;
    this.last = new Map();
  }

  async unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.3;
    this.master.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
    this.noiseBuffer = this.makeNoise(2.5);
    this.startAmbience();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.018 * white) / 1.018;
      data[i] = white * 0.58 + brown * 2.1;
    }
    return buf;
  }

  startAmbience() {
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(this.master);

    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.4;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.022;
    wind.connect(windFilter).connect(windGain).connect(bus);

    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noiseBuffer;
    rumble.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 85;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.06;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain).connect(rumbleGain.gain);
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(bus);

    for (const [freq, gain] of [[46, 0.011], [69, 0.007], [93, 0.004]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      const drift = ctx.createOscillator();
      const driftGain = ctx.createGain();
      drift.frequency.value = 0.03 + Math.random() * 0.03;
      driftGain.gain.value = gain * 0.5;
      drift.connect(driftGain).connect(g.gain);
      osc.connect(g).connect(bus);
      drift.start();
      osc.start();
    }

    wind.start();
    rumble.start();
    lfo.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime + 0.12);
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && !this.muted) this.master.gain.value = this.volume;
  }

  throttled(key, ms) {
    const now = performance.now();
    if ((this.last.get(key) || 0) + ms > now) return true;
    this.last.set(key, now);
    return false;
  }

  noiseBurst({ duration = 0.12, gain = 0.1, type = 'lowpass', freq = 900, q = 0.7, pan = 0, when = 0, sweep = 0 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + duration);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      src.connect(filter).connect(g).connect(p).connect(this.master);
    } else {
      src.connect(filter).connect(g).connect(this.master);
    }
    src.start(t, Math.random() * 1.4);
    src.stop(t + duration + 0.03);
  }

  tone({ freq = 220, endFreq = 80, duration = 0.2, gain = 0.08, type = 'sine', pan = 0, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      osc.connect(g).connect(p).connect(this.master);
    } else {
      osc.connect(g).connect(this.master);
    }
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  rifle(pan = 0) {
    if (this.throttled('rifle', 42)) return;
    this.noiseBurst({ duration: 0.055, gain: 0.055, type: 'bandpass', freq: 1800, q: 0.6, pan });
    this.tone({ freq: 140, endFreq: 48, duration: 0.065, gain: 0.035, pan });
  }

  sniper(pan = 0) {
    this.noiseBurst({ duration: 0.18, gain: 0.13, type: 'bandpass', freq: 1300, q: 0.7, pan, sweep: -900 });
    this.tone({ freq: 95, endFreq: 32, duration: 0.28, gain: 0.09, pan });
  }

  mg(pan = 0) {
    if (this.throttled('mg', 55)) return;
    this.noiseBurst({ duration: 0.045, gain: 0.04, type: 'highpass', freq: 800, q: 0.5, pan });
  }

  cannon(pan = 0) {
    this.noiseBurst({ duration: 0.28, gain: 0.15, type: 'lowpass', freq: 620, q: 0.6, pan, sweep: -420 });
    this.tone({ freq: 78, endFreq: 28, duration: 0.34, gain: 0.16, pan });
  }

  artillery(pan = 0) {
    this.noiseBurst({ duration: 0.42, gain: 0.2, type: 'lowpass', freq: 460, q: 0.5, pan, sweep: -350 });
    this.tone({ freq: 58, endFreq: 24, duration: 0.5, gain: 0.22, pan });
  }

  impact(pan = 0, size = 1) {
    if (this.throttled('impact' + (size > 1.5 ? 'L' : 'S'), 65)) return;
    this.noiseBurst({ duration: 0.22 * size, gain: 0.055 * size, type: 'lowpass', freq: 420, q: 0.5, pan, sweep: -300 });
    this.tone({ freq: 60, endFreq: 28, duration: 0.2 * size, gain: 0.05 * size, pan });
  }

  explosion(pan = 0, size = 1) {
    this.noiseBurst({ duration: 0.55 * size, gain: 0.22 * size, type: 'lowpass', freq: 520, q: 0.7, pan, sweep: -450 });
    this.noiseBurst({ duration: 0.28 * size, gain: 0.09 * size, type: 'bandpass', freq: 2400, q: 0.5, pan, sweep: -1800 });
    this.tone({ freq: 72, endFreq: 21, duration: 0.46 * size, gain: 0.18 * size, pan });
  }

  deploy(pan = 0) {
    this.tone({ freq: 420, endFreq: 680, duration: 0.16, gain: 0.04, type: 'triangle', pan });
    this.noiseBurst({ duration: 0.2, gain: 0.025, type: 'bandpass', freq: 550, q: 0.5, pan });
  }

  ui() {
    this.tone({ freq: 760, endFreq: 920, duration: 0.05, gain: 0.025, type: 'square' });
    this.tone({ freq: 380, endFreq: 410, duration: 0.08, gain: 0.018, type: 'sine', when: 0.03 });
  }

  select() {
    this.tone({ freq: 260, endFreq: 520, duration: 0.08, gain: 0.03, type: 'triangle' });
  }

  deny() {
    this.tone({ freq: 180, endFreq: 110, duration: 0.14, gain: 0.04, type: 'square' });
  }

  alarm() {
    for (let i = 0; i < 2; i++) {
      this.tone({ freq: 620, endFreq: 440, duration: 0.16, gain: 0.035, type: 'sawtooth', when: i * 0.24 });
      this.tone({ freq: 310, endFreq: 240, duration: 0.2, gain: 0.02, type: 'sine', when: i * 0.24 });
    }
  }

  jet() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(1900, t + 1.2);
    filter.frequency.exponentialRampToValueAtTime(240, t + 2.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.6);
    g.gain.linearRampToValueAtTime(0.04, t + 2.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.1);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 3.2);
  }

  victory() {
    const notes = [220, 277, 330, 440, 554];
    notes.forEach((f, i) => {
      this.tone({ freq: f, endFreq: f * 1.01, duration: 0.55, gain: 0.036, type: 'triangle', when: i * 0.13 });
      this.tone({ freq: f * 0.5, endFreq: f * 0.5, duration: 0.7, gain: 0.018, type: 'sine', when: i * 0.13 });
    });
  }

  defeat() {
    const notes = [220, 196, 164, 110];
    notes.forEach((f, i) => {
      this.tone({ freq: f, endFreq: f * 0.93, duration: 0.8, gain: 0.04, type: 'sawtooth', when: i * 0.22 });
    });
  }
}
