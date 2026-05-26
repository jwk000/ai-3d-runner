type Listener<T> = (payload: T) => void;

export class EventBus<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Listener<EventMap[K]>[] } = {};

  on<K extends keyof EventMap>(type: K, fn: Listener<EventMap[K]>): () => void {
    (this.listeners[type] ??= []).push(fn);
    return () => this.off(type, fn);
  }

  off<K extends keyof EventMap>(type: K, fn: Listener<EventMap[K]>): void {
    const arr = this.listeners[type];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  emit<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    const arr = this.listeners[type];
    if (!arr) return;
    for (const fn of arr.slice()) fn(payload);
  }
}

export type GameEvents = {
  'tunnel.rotated': { direction: -1 | 1; newFace: 0 | 1 | 2 | 3 };
  'player.fallout': Record<string, never>;
  'player.jump': Record<string, never>;
  'player.land': Record<string, never>;
  'game.over': { distance: number };
  'game.start': Record<string, never>;
  'game.pause': { paused: boolean };
};
