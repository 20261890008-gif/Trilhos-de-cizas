export type MusicTrack = 'none' | 'lobby' | 'game' | 'boss';

// 4-bar (64-step) Lobby: "Réquiem na Névoa" (C#m -> A -> F#m -> G#)
const LOBBY_PIANO_HZ = [
  // Bar 0: C#m
  277.18, 0, 415.3, 0, 329.63, 0, 554.37, 0, 415.3, 0, 329.63, 0, 277.18, 0, 415.3, 0,
  // Bar 1: A
  220.0, 0, 329.63, 0, 440.0, 0, 554.37, 0, 329.63, 0, 277.18, 0, 220.0, 0, 329.63, 0,
  // Bar 2: F#m
  185.0, 0, 277.18, 0, 369.99, 0, 440.0, 0, 277.18, 0, 220.0, 0, 185.0, 0, 277.18, 0,
  // Bar 3: G#sus4 -> G#
  207.65, 0, 311.13, 0, 415.3, 0, 493.88, 0, 415.3, 0, 311.13, 0, 261.63, 0, 207.65, 0,
];

const LOBBY_STRINGS_LEAD: Array<{ hz: number; dur: number } | null> = (() => {
  const arr: Array<{ hz: number; dur: number } | null> = new Array(64).fill(null);
  arr[0] = { hz: 329.63, dur: 6 };   // E4
  arr[6] = { hz: 311.13, dur: 4 };   // D#4
  arr[10] = { hz: 277.18, dur: 6 };  // C#4
  arr[16] = { hz: 329.63, dur: 4 };  // E4
  arr[20] = { hz: 369.99, dur: 4 };  // F#4
  arr[24] = { hz: 329.63, dur: 4 };  // E4
  arr[28] = { hz: 277.18, dur: 4 };  // C#4
  arr[32] = { hz: 440.0, dur: 6 };   // A4
  arr[38] = { hz: 415.3, dur: 4 };   // G#4
  arr[42] = { hz: 369.99, dur: 6 };  // F#4
  arr[48] = { hz: 311.13, dur: 6 };  // D#4
  arr[54] = { hz: 277.18, dur: 4 };  // C#4
  arr[58] = { hz: 261.63, dur: 6 };  // B#3 / C4 leading tone
  return arr;
})();

const LOBBY_CHOIR_CHORDS: Record<number, number[]> = {
  0: [138.59, 207.65, 329.63],  // C#m
  16: [110.0, 164.81, 277.18],  // A
  32: [92.5, 185.0, 220.0],     // F#m
  48: [103.83, 207.65, 311.13], // G#
};

// 4-bar (64-step) Gameplay: "Marcha das Cinzas" (Dm -> Bb -> Gm -> A)
const GAME_PIANO_HZ = [
  // Bar 0: Dm
  293.66, 440.0, 349.23, 440.0, 587.33, 440.0, 349.23, 440.0,
  293.66, 440.0, 349.23, 440.0, 523.25, 440.0, 349.23, 440.0,
  // Bar 1: Bb
  233.08, 349.23, 293.66, 349.23, 466.16, 349.23, 293.66, 349.23,
  233.08, 349.23, 293.66, 349.23, 440.0, 349.23, 293.66, 349.23,
  // Bar 2: Gm
  196.0, 293.66, 233.08, 293.66, 392.0, 293.66, 233.08, 293.66,
  196.0, 293.66, 233.08, 293.66, 349.23, 293.66, 233.08, 293.66,
  // Bar 3: A7
  220.0, 329.63, 277.18, 329.63, 440.0, 329.63, 277.18, 329.63,
  220.0, 329.63, 392.0, 329.63, 277.18, 329.63, 220.0, 0,
];

const GAME_SPICCATO_BASS = [
  // Bar 0: Dm
  73.42, 0, 73.42, 73.42, 146.83, 0, 73.42, 0, 73.42, 0, 87.31, 0, 82.41, 0, 73.42, 0,
  // Bar 1: Bb
  58.27, 0, 58.27, 58.27, 116.54, 0, 58.27, 0, 58.27, 0, 73.42, 0, 65.41, 0, 58.27, 0,
  // Bar 2: Gm
  98.0, 0, 98.0, 98.0, 196.0, 0, 98.0, 0, 98.0, 0, 116.54, 0, 110.0, 0, 98.0, 0,
  // Bar 3: A
  55.0, 0, 55.0, 55.0, 110.0, 0, 55.0, 0, 55.0, 0, 69.3, 0, 82.41, 0, 55.0, 69.3,
];

const GAME_STRINGS_LEAD: Array<{ hz: number; dur: number } | null> = (() => {
  const arr: Array<{ hz: number; dur: number } | null> = new Array(64).fill(null);
  arr[0] = { hz: 440.0, dur: 6 };   // A4
  arr[6] = { hz: 466.16, dur: 4 };  // Bb4
  arr[10] = { hz: 440.0, dur: 6 };  // A4
  arr[16] = { hz: 587.33, dur: 6 }; // D5
  arr[22] = { hz: 523.25, dur: 4 }; // C5
  arr[26] = { hz: 466.16, dur: 6 }; // Bb4
  arr[32] = { hz: 392.0, dur: 6 };  // G4
  arr[38] = { hz: 440.0, dur: 4 };  // A4
  arr[42] = { hz: 466.16, dur: 6 }; // Bb4
  arr[48] = { hz: 440.0, dur: 6 };  // A4
  arr[54] = { hz: 349.23, dur: 4 }; // F4
  arr[58] = { hz: 329.63, dur: 6 }; // E4
  return arr;
})();

const GAME_CHOIR_CHORDS: Record<number, number[]> = {
  0: [146.83, 220.0, 349.23],   // Dm
  16: [116.54, 174.61, 293.66], // Bb
  32: [98.0, 196.0, 233.08],    // Gm
  48: [110.0, 164.81, 277.18],  // A
};

// 4-bar (64-step) Boss: "Dies Irae dos Trilhos" (C#m -> D -> Bm -> G#7)
const BOSS_PIANO_HZ = [
  277.18, 415.3, 329.63, 415.3, 554.37, 415.3, 329.63, 415.3,
  277.18, 415.3, 329.63, 415.3, 554.37, 415.3, 329.63, 277.18,
  293.66, 440.0, 349.23, 440.0, 587.33, 440.0, 349.23, 440.0,
  293.66, 440.0, 349.23, 440.0, 587.33, 440.0, 349.23, 293.66,
  246.94, 369.99, 293.66, 369.99, 493.88, 369.99, 293.66, 369.99,
  246.94, 369.99, 293.66, 369.99, 493.88, 369.99, 293.66, 246.94,
  207.65, 311.13, 261.63, 311.13, 415.3, 311.13, 261.63, 311.13,
  207.65, 311.13, 415.3, 311.13, 261.63, 246.94, 207.65, 0,
];

const BOSS_SPICCATO_BASS = [
  69.3, 69.3, 0, 69.3, 138.59, 69.3, 82.41, 69.3, 69.3, 69.3, 0, 69.3, 103.83, 82.41, 69.3, 0,
  73.42, 73.42, 0, 73.42, 146.83, 73.42, 87.31, 73.42, 73.42, 73.42, 0, 73.42, 110.0, 87.31, 73.42, 0,
  61.74, 61.74, 0, 61.74, 123.47, 61.74, 73.42, 61.74, 61.74, 61.74, 0, 61.74, 92.5, 73.42, 61.74, 0,
  51.91, 51.91, 0, 51.91, 103.83, 51.91, 65.41, 51.91, 51.91, 61.74, 65.41, 69.3, 73.42, 69.3, 65.41, 51.91,
];

const BOSS_STRINGS_LEAD: Array<{ hz: number; dur: number } | null> = (() => {
  const arr: Array<{ hz: number; dur: number } | null> = new Array(64).fill(null);
  arr[0] = { hz: 554.37, dur: 5 };  // C#5
  arr[5] = { hz: 523.25, dur: 3 };  // C5
  arr[8] = { hz: 554.37, dur: 4 };  // C#5
  arr[12] = { hz: 659.25, dur: 4 }; // E5
  arr[16] = { hz: 587.33, dur: 6 }; // D5
  arr[22] = { hz: 554.37, dur: 4 }; // C#5
  arr[26] = { hz: 440.0, dur: 6 };  // A4
  arr[32] = { hz: 493.88, dur: 6 }; // B4
  arr[38] = { hz: 440.0, dur: 4 };  // A4
  arr[42] = { hz: 369.99, dur: 6 }; // F#4
  arr[48] = { hz: 415.3, dur: 6 };  // G#4
  arr[54] = { hz: 523.25, dur: 4 }; // C5
  arr[58] = { hz: 415.3, dur: 6 };  // G#4
  return arr;
})();

const BOSS_CHOIR_CHORDS: Record<number, number[]> = {
  0: [138.59, 207.65, 329.63],  // C#m
  16: [146.83, 220.0, 349.23],  // Dm / D
  32: [123.47, 185.0, 293.66],  // Bm
  48: [103.83, 207.65, 311.13], // G#
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicReverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTrack: MusicTrack = 'none';
  private musicDucked = false;
  private musicTimer: number | null = null;
  private musicNextStepTime = 0;
  private musicStep = 0;
  public muted = false;
  public masterVolume = 0.65;
  public musicEnabled = true;

  private initAudioNodes(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 1800;
      this.musicFilter.Q.value = 0.6;

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicFilter.connect(this.musicGain);
      this.musicGain.connect(this.masterGain);

      // Shared warm cathedral acoustic space (dual-tap damped delay bus)
      this.musicReverbSend = this.ctx.createGain();
      this.musicReverbSend.gain.value = 0.34;
      const d1 = this.ctx.createDelay(1.0);
      d1.delayTime.value = 0.24;
      const d2 = this.ctx.createDelay(1.0);
      d2.delayTime.value = 0.39;
      const fb1 = this.ctx.createGain();
      fb1.gain.value = 0.38;
      const fb2 = this.ctx.createGain();
      fb2.gain.value = 0.32;
      const damp = this.ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 1450;

      this.musicReverbSend.connect(d1);
      this.musicReverbSend.connect(d2);
      d1.connect(damp);
      d2.connect(damp);
      damp.connect(fb1);
      fb1.connect(d2);
      damp.connect(fb2);
      fb2.connect(d1);
      damp.connect(this.musicGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || this.masterVolume <= 0.001) return null;
    return this.initAudioNodes();
  }

  public unlock(): void {
    const ctx = this.initAudioNodes();
    if (ctx && this.musicEnabled && this.musicTrack !== 'none' && this.musicTimer === null) {
      this.startMusicScheduler();
    }
    this.updateMusicGain();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.03
      );
    }
    this.updateMusicGain();
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.03
      );
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusicScheduler();
    } else if (this.ctx && this.musicTrack !== 'none') {
      this.startMusicScheduler();
    }
    this.updateMusicGain();
  }

  public setMusicTrack(track: MusicTrack, ducked = false): void {
    const changed = this.musicTrack !== track;
    this.musicTrack = track;
    this.musicDucked = ducked;

    if (track === 'none' || !this.musicEnabled) {
      this.stopMusicScheduler();
      this.updateMusicGain();
      return;
    }

    if (changed) {
      this.musicStep = 0;
      if (this.ctx) {
        this.musicNextStepTime = this.ctx.currentTime + 0.08;
      }
    }

    if (this.ctx && this.musicTimer === null) {
      this.startMusicScheduler();
    }
    this.updateMusicGain();
  }

  private updateMusicGain(): void {
    if (!this.musicGain || !this.ctx || !this.musicFilter) return;
    const now = this.ctx.currentTime;
    const active = this.musicEnabled && !this.muted && this.musicTrack !== 'none';
    const baseGain =
      this.musicTrack === 'lobby' ? 0.36 : this.musicTrack === 'boss' ? 0.40 : 0.37;
    const target = active ? baseGain * (this.musicDucked ? 0.32 : 1) : 0;
    this.musicGain.gain.setTargetAtTime(target, now, 0.14);

    const cutoff = this.musicDucked
      ? 720
      : this.musicTrack === 'lobby'
      ? 1550
      : this.musicTrack === 'boss'
      ? 2400
      : 2050;
    this.musicFilter.frequency.setTargetAtTime(cutoff, now, 0.18);
  }

  private startMusicScheduler(): void {
    if (this.musicTimer !== null || !this.ctx || typeof window === 'undefined') return;
    this.musicNextStepTime = this.ctx.currentTime + 0.06;
    this.musicTimer = window.setInterval(() => this.pumpMusicScheduler(), 140);
  }

  private stopMusicScheduler(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private pumpMusicScheduler(): void {
    const ctx = this.ctx;
    if (
      !ctx ||
      ctx.state !== 'running' ||
      !this.musicEnabled ||
      this.muted ||
      this.musicTrack === 'none' ||
      !this.musicFilter
    ) {
      return;
    }

    const stepSec =
      this.musicTrack === 'lobby' ? 0.42 : this.musicTrack === 'boss' ? 0.2 : 0.235;
    const horizon = ctx.currentTime + 0.36;

    if (this.musicNextStepTime < ctx.currentTime - 0.15) {
      this.musicNextStepTime = ctx.currentTime + 0.04;
    }

    while (this.musicNextStepTime < horizon) {
      this.scheduleMusicStep(ctx, this.musicNextStepTime, this.musicStep, stepSec);
      this.musicNextStepTime += stepSec;
      this.musicStep = (this.musicStep + 1) % 64;
    }
  }

  private scheduleMusicStep(
    ctx: AudioContext,
    t: number,
    step: number,
    stepSec: number
  ): void {
    const dest = this.musicFilter;
    if (!dest) return;

    if (this.musicTrack === 'lobby') {
      // 1. Coral sombrio (Dark Choir) sustentando o acorde do compasso
      const choirNotes = LOBBY_CHOIR_CHORDS[step];
      if (choirNotes) {
        this.playChoirChord(ctx, dest, choirNotes, t, stepSec * 15.8, 0.115, 0.55);
      }

      // 2. Cordas graves (Contrabaixo / Violoncelo) na tônica de cada compasso
      if (step % 16 === 0) {
        const bassHz = step === 0 ? 69.3 : step === 16 ? 55.0 : step === 32 ? 46.25 : 51.91;
        this.playStringEnsembleNote(ctx, dest, bassHz, t, stepSec * 15.6, 0.145, true);
      }

      // 3. Cordas melódicas (Violino / Viola com vibrato)
      const lead = LOBBY_STRINGS_LEAD[step];
      if (lead) {
        this.playStringEnsembleNote(
          ctx,
          dest,
          lead.hz,
          t,
          stepSec * lead.dur * 0.96,
          0.11,
          false
        );
      }

      // 4. Piano sombrio ao fundo (arpejo distante com reverberação de catedral)
      const pianoHz = LOBBY_PIANO_HZ[step];
      if (pianoHz > 0) {
        this.playBackgroundPiano(ctx, dest, pianoHz, t, stepSec * 3.6, 0.085);
      }
      return;
    }

    const isBoss = this.musicTrack === 'boss';
    const pianoArr = isBoss ? BOSS_PIANO_HZ : GAME_PIANO_HZ;
    const bassArr = isBoss ? BOSS_SPICCATO_BASS : GAME_SPICCATO_BASS;
    const leadArr = isBoss ? BOSS_STRINGS_LEAD : GAME_STRINGS_LEAD;
    const choirMap = isBoss ? BOSS_CHOIR_CHORDS : GAME_CHOIR_CHORDS;

    // 1. Coral dramático na entrada de cada compasso
    const choirNotes = choirMap[step];
    if (choirNotes) {
      this.playChoirChord(
        ctx,
        dest,
        choirNotes,
        t,
        stepSec * 15.4,
        isBoss ? 0.13 : 0.105,
        0.38
      );
    }

    // 2. Cordas graves spiccato (cellos e contrabaixos marcando o ritmo tenso)
    const bassHz = bassArr[step];
    if (bassHz > 0) {
      this.playSpiccatoString(
        ctx,
        dest,
        bassHz,
        t,
        stepSec * 0.92,
        isBoss ? 0.18 : 0.17
      );
    }

    // 3. Cordas agudas (violinos em arco longo com vibrato)
    const lead = leadArr[step];
    if (lead) {
      this.playStringEnsembleNote(
        ctx,
        dest,
        lead.hz,
        t,
        stepSec * lead.dur * 0.96,
        isBoss ? 0.115 : 0.1,
        false
      );
    }

    // 4. Piano de fundo (arpejos sombrios contínuos em segundo plano)
    const pianoHz = pianoArr[step];
    if (pianoHz > 0) {
      this.playBackgroundPiano(
        ctx,
        dest,
        pianoHz,
        t,
        stepSec * 2.2,
        isBoss ? 0.072 : 0.068
      );
    }

    // 5. Percussão industrial contida (bumbo profundo & estalo metálico dos trilhos)
    const barStep = step % 16;
    if (barStep % 4 === 0) {
      this.playDarkKick(ctx, dest, t, isBoss ? 0.22 : 0.18);
    }
    if (this.noiseBuffer && (barStep % 4 === 2 || (isBoss && barStep % 2 === 1))) {
      this.playRailPerc(
        ctx,
        dest,
        t,
        barStep % 4 === 2 ? 0.075 : 0.04,
        isBoss ? 2100 : 1650,
        0.065
      );
    }
  }

  /** Multi-voice bowed string section (Violins/Violas/Cellos) with vibrato & bow swell */
  private playStringEnsembleNote(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    peak: number,
    isBassSection: boolean
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBassSection ? 360 : 720, t);
    filter.frequency.linearRampToValueAtTime(
      isBassSection ? 620 : 1750,
      t + Math.min(0.45, dur * 0.35)
    );
    filter.frequency.linearRampToValueAtTime(isBassSection ? 340 : 950, t + dur);
    filter.Q.value = 1.1;

    const gain = ctx.createGain();
    const attack = Math.min(isBassSection ? 0.32 : 0.24, dur * 0.32);
    const release = Math.min(0.45, dur * 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak * 0.88, Math.max(t + attack, t + dur - release));
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    filter.connect(gain);
    gain.connect(dest);
    if (this.musicReverbSend) {
      gain.connect(this.musicReverbSend);
    }

    // Subtle bowed vibrato LFO
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = isBassSection ? 4.4 : 5.3;
    vibGain.gain.value = freq * (isBassSection ? 0.0028 : 0.0045);
    vib.connect(vibGain);

    const detunes = isBassSection ? [-6, 5] : [-8, 0, 8];
    detunes.forEach((cents, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 1 && !isBassSection ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(cents, t);
      vibGain.connect(osc.frequency);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.06);
    });

    vib.start(t);
    vib.stop(t + dur + 0.06);
  }

  /** Fast bowed spiccato strings (cellos/contrabasses) for dramatic chase tension */
  private playSpiccatoString(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    peak: number
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, t);
    filter.frequency.exponentialRampToValueAtTime(280, t + dur);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.022);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    filter.connect(gain);
    gain.connect(dest);

    [-7, 7].forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(cents, t);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    });
  }

  /** Dark Cathedral Choir with dual vowel formant filters ("Ooh / Aah") & slow breath swell */
  private playChoirChord(
    ctx: AudioContext,
    dest: AudioNode,
    notes: number[],
    t: number,
    dur: number,
    peak: number,
    attackSec: number
  ): void {
    // Parallel formant filters shaping dark choral vowel ("Ooh" -> "Aah" bloom)
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(340, t);
    f1.frequency.linearRampToValueAtTime(490, t + dur * 0.48);
    f1.frequency.linearRampToValueAtTime(360, t + dur);
    f1.Q.value = 3.6;

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(840, t);
    f2.frequency.linearRampToValueAtTime(1060, t + dur * 0.48);
    f2.frequency.linearRampToValueAtTime(860, t + dur);
    f2.Q.value = 4.2;

    const bodyLP = ctx.createBiquadFilter();
    bodyLP.type = 'lowpass';
    bodyLP.frequency.value = 1350;

    const choirGain = ctx.createGain();
    const atk = Math.min(attackSec, dur * 0.35);
    const rel = Math.min(0.85, dur * 0.35);
    choirGain.gain.setValueAtTime(0.0001, t);
    choirGain.gain.linearRampToValueAtTime(peak, t + atk);
    choirGain.gain.setValueAtTime(peak * 0.9, Math.max(t + atk, t + dur - rel));
    choirGain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    f1.connect(bodyLP);
    f2.connect(bodyLP);
    bodyLP.connect(choirGain);
    choirGain.connect(dest);
    if (this.musicReverbSend) {
      choirGain.connect(this.musicReverbSend);
    }

    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    vib.frequency.value = 4.8;
    vibDepth.gain.value = 0.7;
    vib.connect(vibDepth);

    for (const freq of notes) {
      [-9, 9].forEach((cents) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime(cents, t);
        vibDepth.connect(osc.frequency);
        osc.connect(f1);
        osc.connect(f2);
        osc.start(t);
        osc.stop(t + dur + 0.08);
      });
    }

    vib.start(t);
    vib.stop(t + dur + 0.08);
  }

  /** Soft Felt/Grand Piano in the background with hammer transient, overtone decay & reverb tail */
  private playBackgroundPiano(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    peak: number
  ): void {
    const pianoLP = ctx.createBiquadFilter();
    pianoLP.type = 'lowpass';
    pianoLP.frequency.setValueAtTime(Math.min(2600, freq * 5.2), t);
    pianoLP.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.4), t + dur * 0.75);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.012);
    env.gain.exponentialRampToValueAtTime(peak * 0.36, t + Math.min(0.28, dur * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    pianoLP.connect(env);
    // Keep piano tucked softly in the background & diffused through the cathedral delay bus
    env.connect(dest);
    if (this.musicReverbSend) {
      env.connect(this.musicReverbSend);
    }

    // Fundamental body (triangle) + warm 2nd harmonic overtone (sine)
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);
    osc1.connect(pianoLP);
    osc1.start(t);
    osc1.stop(t + dur + 0.05);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t);
    g2.gain.setValueAtTime(0.32, t);
    g2.gain.exponentialRampToValueAtTime(0.01, t + Math.min(0.45, dur * 0.45));
    osc2.connect(g2);
    g2.connect(pianoLP);
    osc2.start(t);
    osc2.stop(t + dur + 0.05);

    // Subtle soft felt hammer thump
    if (this.noiseBuffer) {
      const hammer = ctx.createBufferSource();
      hammer.buffer = this.noiseBuffer;
      const hFilt = ctx.createBiquadFilter();
      hFilt.type = 'bandpass';
      hFilt.frequency.value = Math.min(1800, freq * 2.5);
      hFilt.Q.value = 2.0;
      const hGain = ctx.createGain();
      hGain.gain.setValueAtTime(peak * 0.28, t);
      hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      hammer.connect(hFilt);
      hFilt.connect(hGain);
      hGain.connect(pianoLP);
      hammer.start(t);
      hammer.stop(t + 0.032);
    }
  }

  private playDarkKick(ctx: AudioContext, dest: AudioNode, t: number, peak: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(88, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.15);
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playRailPerc(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    peak: number,
    bandHz: number,
    dur: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = bandHz;
    filter.Q.value = 3.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.03);
  }

  public dispose(): void {
    this.stopMusicScheduler();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.musicGain = null;
    this.musicFilter = null;
    this.musicReverbSend = null;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createPanner(pan: number): StereoPannerNode | null {
    if (!this.ctx || !this.masterGain) return null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      panner.connect(this.masterGain);
      return panner;
    }
    return null;
  }

  /** Sharp metallic iron spikes slamming onto the map when tracks materialize */
  public playTrackAppear(pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    // Metallic rail clank
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(340, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    osc2.frequency.setValueAtTime(518, now);
    osc2.frequency.exponentialRampToValueAtTime(155, now + 0.14);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 920;
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.23);
    osc2.stop(now + 0.23);

    // Subtle warning whistle chirp
    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'triangle';
    whistle.frequency.setValueAtTime(640, now + 0.04);
    whistle.frequency.linearRampToValueAtTime(585, now + 0.28);
    wGain.gain.setValueAtTime(0.001, now);
    wGain.gain.linearRampToValueAtTime(0.11, now + 0.08);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    whistle.connect(wGain);
    wGain.connect(dest);
    whistle.start(now);
    whistle.stop(now + 0.31);
  }

  /** Monstrous dissonant expressionist steam locomotive horn */
  public playTrainHorn(pan = 0, intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    // Classic eerie minor-triad steam horn (C#3, E3, G3 detuned)
    const freqs = [138.59, 164.81, 196.0, 277.18];
    const masterHorn = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1350, now);
    filter.frequency.linearRampToValueAtTime(850, now + 0.65);

    masterHorn.gain.setValueAtTime(0.001, now);
    masterHorn.gain.linearRampToValueAtTime(0.32 * intensity, now + 0.05);
    masterHorn.gain.setValueAtTime(0.28 * intensity, now + 0.38);
    masterHorn.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

    filter.connect(masterHorn);
    masterHorn.connect(dest);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * (1 + (idx - 1.5) * 0.006), now);
      osc.frequency.linearRampToValueAtTime(f * 0.96, now + 0.76);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + 0.8);
    });

    // Steam blast layer
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = 1400;
      nFilter.Q.value = 1.2;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.22 * intensity, now + 0.04);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(dest);
      noise.start(now);
      noise.stop(now + 0.7);
    }
  }

  /** Heavy rhythmic locomotive chug & sub-bass rail rumble */
  public playTrainChug(proximity = 1, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.04, Math.min(1, proximity));
    const dest = this.createPanner(pan) || this.masterGain;

    // Sub-bass iron wheel thump
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(78, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.13);
    subGain.gain.setValueAtTime(0.45 * vol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.16);

    // Chugging steam noise burst
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(720 + 600 * vol, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32 * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(now);
    src.stop(now + 0.18);
  }

  /** Heavy tectonic track crack when a Seismic Quake Train spawns */
  public playQuakeTrainAppear(pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    // Double deep tectonic impact
    [0, 0.12].forEach((offset, idx) => {
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(idx === 0 ? 95 : 74, now + offset);
      sub.frequency.exponentialRampToValueAtTime(24, now + offset + 0.28);
      gain.gain.setValueAtTime(0.45, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.32);
      sub.connect(gain);
      gain.connect(dest);
      sub.start(now + offset);
      sub.stop(now + offset + 0.34);
    });

    if (this.noiseBuffer) {
      const rumble = ctx.createBufferSource();
      rumble.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(380, now);
      lp.frequency.exponentialRampToValueAtTime(110, now + 0.42);
      const rGain = ctx.createGain();
      rGain.gain.setValueAtTime(0.35, now);
      rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      rumble.connect(lp);
      lp.connect(rGain);
      rGain.connect(dest);
      rumble.start(now);
      rumble.stop(now + 0.46);
    }
  }

  /** Ultra-deep subterranean foghorn warning for Seismic Quake Train */
  public playQuakeTrainHorn(pan = 0, intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    const freqs = [55.0, 73.42, 82.41, 110.0];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, now);
    lp.frequency.linearRampToValueAtTime(210, now + 0.9);

    const hornGain = ctx.createGain();
    hornGain.gain.setValueAtTime(0.001, now);
    hornGain.gain.linearRampToValueAtTime(0.42 * intensity, now + 0.08);
    hornGain.gain.setValueAtTime(0.36 * intensity, now + 0.52);
    hornGain.gain.exponentialRampToValueAtTime(0.001, now + 0.96);

    lp.connect(hornGain);
    hornGain.connect(dest);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 0.91, now + 0.94);
      osc.connect(lp);
      osc.start(now);
      osc.stop(now + 0.98);
    });
  }

  /** Heavy booming seismic chug while Quake Train rattles the arena */
  public playQuakeTrainChug(proximity = 1, pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const vol = Math.max(0.18, Math.min(1, proximity));
    const dest = this.createPanner(pan) || this.masterGain;

    const boom = ctx.createOscillator();
    const bGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(58, now);
    boom.frequency.exponentialRampToValueAtTime(22, now + 0.19);
    bGain.gain.setValueAtTime(0.55 * vol, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    boom.connect(bGain);
    bGain.connect(dest);
    boom.start(now);
    boom.stop(now + 0.23);

    const grind = ctx.createBufferSource();
    grind.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340 + 280 * vol;
    const gGain = ctx.createGain();
    gGain.gain.setValueAtTime(0.34 * vol, now);
    gGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    grind.connect(lp);
    lp.connect(gGain);
    gGain.connect(dest);
    grind.start(now);
    grind.stop(now + 0.21);
  }

  /** Sharp high-voltage electric crackle when a Flash Train materializes */
  public playFlashTrainAppear(pan = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    [0, 0.075, 0.15].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980 + idx * 320, now + offset);
      osc.frequency.exponentialRampToValueAtTime(1650 + idx * 240, now + offset + 0.07);
      gain.gain.setValueAtTime(0.19, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    });

    if (this.noiseBuffer) {
      const zap = ctx.createBufferSource();
      zap.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 3200;
      hp.Q.value = 2.4;
      const zGain = ctx.createGain();
      zGain.gain.setValueAtTime(0.26, now);
      zGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      zap.connect(hp);
      hp.connect(zGain);
      zGain.connect(dest);
      zap.start(now);
      zap.stop(now + 0.2);
    }
  }

  /** Piercing high-voltage twin electric siren for Flash Train */
  public playFlashTrainHorn(pan = 0, intensity = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const dest = this.createPanner(pan) || this.masterGain;

    const freqs = [783.99, 1046.5, 1318.51];
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, now);
    bp.frequency.linearRampToValueAtTime(2600, now + 0.35);
    bp.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24 * intensity, now + 0.04);
    gain.gain.setValueAtTime(0.21 * intensity, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.64);

    bp.connect(gain);
    gain.connect(dest);

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 1.18, now + 0.25);
      osc.frequency.linearRampToValueAtTime(f * 0.98, now + 0.62);
      osc.connect(bp);
      osc.start(now);
      osc.stop(now + 0.66);
    });
  }

  /** Blinding electric arc burst when the Flash Train triggers its 0.5s screen flash */
  public playFlashBurst(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.42);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);

    if (this.noiseBuffer) {
      const spark = ctx.createBufferSource();
      spark.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2600;
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.34, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      spark.connect(hp);
      hp.connect(sGain);
      sGain.connect(this.masterGain);
      spark.start(now);
      spark.stop(now + 0.3);
    }
  }

  /** Normal agile monkey hop */
  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.11);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** High-velocity vault boost off a map support (apoio) */
  public playSupportVault(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Iron spring resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);

    // Wind rush noise
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(500, now);
      nFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.22);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.26);
    }
  }

  /** Coal source hit crunch */
  public playCoalHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1100;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.22, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.1);
    }
  }

  /** Coal source completely shattered */
  public playCoalDestroy(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Deep collapse boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.48);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.42, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.52);
    }
  }

  /** Monkey hit by train */
  public playMonkeyHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Heavy impact + agonized primate screech synth
    const screech = ctx.createOscillator();
    const sGain = ctx.createGain();
    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(720, now);
    screech.frequency.exponentialRampToValueAtTime(240, now + 0.32);
    sGain.gain.setValueAtTime(0.28, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    screech.connect(sGain);
    sGain.connect(this.masterGain);
    screech.start(now);
    screech.stop(now + 0.35);

    const thud = ctx.createOscillator();
    const tGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(95, now);
    thud.frequency.exponentialRampToValueAtTime(26, now + 0.25);
    tGain.gain.setValueAtTime(0.55, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    thud.connect(tGain);
    tGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.3);
  }

  /** Final climax: train grinds to a screeching halt and vents dying steam */
  public playTrainShutdown(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    // Descending dissonant metallic brake screech
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(620, now);
    osc1.frequency.exponentialRampToValueAtTime(65, now + 2.1);
    osc2.frequency.setValueAtTime(665, now);
    osc2.frequency.exponentialRampToValueAtTime(72, now + 2.1);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 2.1);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.3);
    osc2.stop(now + 2.3);

    // Dying steam hiss
    if (this.noiseBuffer) {
      const steam = ctx.createBufferSource();
      steam.buffer = this.noiseBuffer;
      const sFilter = ctx.createBiquadFilter();
      sFilter.type = 'highpass';
      sFilter.frequency.value = 900;
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.01, now);
      sGain.gain.linearRampToValueAtTime(0.28, now + 0.35);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      steam.connect(sFilter);
      sFilter.connect(sGain);
      sGain.connect(this.masterGain);
      steam.start(now);
      steam.stop(now + 2.45);
    }
  }

  /** Metallic silver coin chime */
  public playCoinPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.055);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  /** Time Stop (3s) deep reverse-pitch freeze pulse */
  public playTimeStop(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(520, now);
    osc1.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    osc2.frequency.setValueAtTime(260, now);
    osc2.frequency.exponentialRampToValueAtTime(28, now + 0.55);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.55);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  }

  /** Time resumes sharp chime */
  public playTimeResume(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.18);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Generic ability burst */
  public playAbility(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.15);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** Loot crate shake rattle tick */
  public playCrateShake(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** High-speed monkey pack slide skid & air whoosh */
  public playSlideWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.48);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.52);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(340, now + 0.55);
      filter.Q.value = 1.6;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.28, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.6);
    }
  }

  /** Crimson coal radar pulse chime */
  public playCoalBeacon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [520, 780, 1040].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Loot crate unlock chord */
  public playCrateOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [220, 277.18, 329.63, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.001, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.06 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.48);
    });
  }

  /** Subtle mechanical tactile click for lobby UI buttons */
  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.032);
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}
