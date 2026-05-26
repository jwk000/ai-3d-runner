import type { EventBus, GameEvents } from '../util/EventBus';

const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

export class AudioManager {
  private readonly bgm = new Audio(`${AUDIO_BASE}bgm-free-fall.ogg`);
  private readonly click = new Audio(`${AUDIO_BASE}click.wav`);
  private readonly jump = new Audio(`${AUDIO_BASE}jump.wav`);
  private readonly fallDeath = new Audio(`${AUDIO_BASE}fall-death.wav`);
  private unlocked = false;

  constructor(bus: EventBus<GameEvents>) {
    this.bgm.loop = true;
    this.bgm.volume = 0.34;
    this.click.volume = 0.55;
    this.jump.volume = 0.62;
    this.fallDeath.volume = 0.72;

    bus.on('game.start', () => this.startBgm());
    bus.on('game.pause', ({ paused }) => (paused ? this.pauseBgm() : this.startBgm()));
    bus.on('player.jump', () => this.play(this.jump));
    bus.on('player.fallout', () => this.play(this.fallDeath));
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const audio of [this.bgm, this.click, this.jump, this.fallDeath]) {
      audio.load();
    }
  }

  playClick(): void {
    this.unlock();
    this.play(this.click);
  }

  startBgm(): void {
    this.unlock();
    this.bgm.play().catch(() => undefined);
  }

  pauseBgm(): void {
    this.bgm.pause();
  }

  private play(audio: HTMLAudioElement): void {
    if (!this.unlocked) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }
}
