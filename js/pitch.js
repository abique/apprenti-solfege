// Détection de hauteur (algorithme YIN) et accès au micro.

/**
 * Estime la fréquence fondamentale d'un bloc d'échantillons.
 * @returns {{freq:number, clarity:number, rms:number}} freq = 0 si aucune note nette.
 */
export function detectPitch(buf, sampleRate, { minFreq = 75, maxFreq = 1100, threshold = 0.2, minRms = 0.012 } = {}) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < minRms) return { freq: 0, clarity: 0, rms };

  const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(n / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const w = n - maxTau;

  // Fonction de différence.
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < w; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }

  // Différence moyenne cumulée normalisée.
  const c = new Float32Array(maxTau + 1);
  c[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    c[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  let tauEst = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (c[tau] < threshold) {
      while (tau + 1 <= maxTau && c[tau + 1] < c[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst < 0) return { freq: 0, clarity: 0, rms };

  // Interpolation parabolique pour une précision sous-échantillon.
  let better = tauEst;
  if (tauEst > 1 && tauEst < maxTau) {
    const s0 = c[tauEst - 1];
    const s1 = c[tauEst];
    const s2 = c[tauEst + 1];
    const denom = s0 + s2 - 2 * s1;
    if (Math.abs(denom) > 1e-9) better = tauEst + (s0 - s2) / (2 * denom);
  }
  return { freq: sampleRate / better, clarity: 1 - c[tauEst], rms };
}

export function micSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

export class Microphone {
  constructor() {
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.buf = null;
    this.sampleRate = 48000;
  }

  async start(audioCtx) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.source = audioCtx.createMediaStreamSource(this.stream);
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.sampleRate = audioCtx.sampleRate;
  }

  read(opts) {
    if (!this.analyser) return { freq: 0, clarity: 0, rms: 0 };
    this.analyser.getFloatTimeDomainData(this.buf);
    return detectPitch(this.buf, this.sampleRate, opts);
  }

  stop() {
    if (this.stream) for (const t of this.stream.getTracks()) t.stop();
    try { this.source?.disconnect(); } catch { /* rien */ }
    this.stream = this.source = this.analyser = null;
  }
}
