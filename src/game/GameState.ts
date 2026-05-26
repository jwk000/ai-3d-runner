export type GamePhase = 'menu' | 'running' | 'falling' | 'paused' | 'gameover';

export class GameState {
  phase: GamePhase = 'menu';
  distance = 0;
  elapsed = 0;
  bestDistance = 0;

  reset(): void {
    this.distance = 0;
    this.elapsed = 0;
  }

  difficulty(): number {
    const trend = 1 - Math.exp(-Math.max(0, this.distance) / 720);
    const wave = (Math.sin(this.distance / 85) + 1) * 0.5;
    const pulse = (Math.sin(this.distance / 31 + 1.7) + 1) * 0.5;
    return Math.min(1, trend * (0.62 + wave * 0.28 + pulse * 0.1));
  }
}
