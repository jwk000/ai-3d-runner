export class Engine {
  private last = 0;
  private acc = 0;
  private readonly fixedDt: number;
  private running = false;
  private rafId = 0;

  fixedUpdate: (dt: number) => void = () => {};
  lateUpdate: (dt: number) => void = () => {};
  render: () => void = () => {};

  constructor(fixedHz = 60) {
    this.fixedDt = 1 / fixedHz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const real = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.acc += real;
    while (this.acc >= this.fixedDt) {
      this.fixedUpdate(this.fixedDt);
      this.acc -= this.fixedDt;
    }
    this.lateUpdate(real);
    this.render();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
