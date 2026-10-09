// Counts time only while the game is visible and not paused.

export class Timer {
  private since: number | null = null;

  constructor(private readonly onElapsed: (ms: number) => void) {}

  get running(): boolean {
    return this.since !== null;
  }

  start(now: number): void {
    if (this.since === null) this.since = now;
  }

  /** Reports the time since the last report and keeps running. */
  flush(now: number): void {
    if (this.since === null) return;
    const ms = Math.max(0, now - this.since);
    this.since = now;
    if (ms) this.onElapsed(ms);
  }

  stop(now: number): void {
    this.flush(now);
    this.since = null;
  }
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
