import { CONFIG, type FaceIndex } from '../../config';
import { easeOutCubic } from '../../util/math';

export class TunnelRotator {
  private angle = 0;
  private from = 0;
  private to = 0;
  private elapsed = 0;
  private duration = CONFIG.camera.rotateDuration;
  private active = false;
  private onComplete: (() => void) | null = null;

  currentFace: FaceIndex = 0;

  startRotation(targetFace: FaceIndex, deltaAngle: number, onComplete: () => void): void {
    this.from = this.angle;
    this.to = this.angle + deltaAngle;
    this.elapsed = 0;
    this.active = true;
    this.onComplete = onComplete;
    void targetFace;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const e = easeOutCubic(t);
    this.angle = this.from + (this.to - this.from) * e;
    if (t >= 1) {
      this.active = false;
      const quarter = Math.PI / 2;
      this.angle = Math.round(this.to / quarter) * quarter;
      this.onComplete?.();
      this.onComplete = null;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getAngle(): number {
    return this.angle;
  }

  // v0.3: returns the *snapped* (pre-rotation) angle used by the camera
  // during a rotation animation, so the camera does not roll while the tunnel
  // visibly spins around the player.
  getStableAngle(): number {
    return this.active ? this.from : this.angle;
  }
}
