export type ActionType = 'left' | 'right' | 'jump' | 'pause';

type ActionHandler = (action: ActionType) => void;

export class Input {
  private locked = false;
  private bufferedJumpUntil = 0;
  private handler: ActionHandler | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  attach(handler: ActionHandler): void {
    this.handler = handler;
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    this.handler = null;
  }

  lock(): void {
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
  }

  consumeJumpBuffer(now: number): boolean {
    if (now <= this.bufferedJumpUntil) {
      this.bufferedJumpUntil = 0;
      return true;
    }
    return false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.handler) return;
    let action: ActionType | null = null;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        action = 'left';
        break;
      case 'ArrowRight':
      case 'KeyD':
        action = 'right';
        break;
      case 'Space':
        action = 'jump';
        break;
      case 'Escape':
        action = 'pause';
        break;
      default:
        return;
    }
    e.preventDefault();
    if (action === 'jump') {
      this.bufferedJumpUntil = performance.now() / 1000 + 0.12;
    }
    if (this.locked && action !== 'pause') return;
    this.handler(action);
  }
}
