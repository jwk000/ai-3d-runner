export type GamePhase = 'menu' | 'running' | 'paused' | 'gameover';

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
    return Math.min(1, this.elapsed / 180);
  }
}
