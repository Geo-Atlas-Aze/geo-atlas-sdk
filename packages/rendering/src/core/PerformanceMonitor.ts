export interface PerformanceMetrics {
  readonly fps: number;
  readonly renderDurationMs: number;
  readonly frameDrops: number;
  readonly memoryUsageBytes: number;
  readonly loadedChunks: number;
  readonly renderedFeatures: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
}

/**
 * Collects runtime performance metrics. Active only in development by default.
 */
export class PerformanceMonitor {
  private enabled: boolean;
  private frameCount = 0;
  private frameDrops = 0;
  private lastFrameAt = 0;
  private fps = 0;
  private renderDurationMs = 0;
  private memoryUsageBytes = 0;
  private loadedChunks = 0;
  private renderedFeatures = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private rafId: number | null = null;

  constructor(enabled = process.env['NODE_ENV'] !== 'production') {
    this.enabled = enabled;
    if (this.enabled && typeof globalThis.requestAnimationFrame === 'function') {
      this.start();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.start();
      return;
    }
    this.stop();
  }

  recordRender(durationMs: number, renderedFeatures: number): void {
    if (!this.enabled) {
      return;
    }
    this.renderDurationMs = durationMs;
    this.renderedFeatures = renderedFeatures;
  }

  recordChunks(count: number): void {
    if (!this.enabled) {
      return;
    }
    this.loadedChunks = count;
  }

  recordCache(hit: boolean): void {
    if (!this.enabled) {
      return;
    }
    if (hit) {
      this.cacheHits += 1;
    } else {
      this.cacheMisses += 1;
    }
  }

  recordMemory(bytes: number): void {
    if (!this.enabled) {
      return;
    }
    this.memoryUsageBytes = bytes;
  }

  getMetrics(): PerformanceMetrics {
    return Object.freeze({
      fps: this.fps,
      renderDurationMs: this.renderDurationMs,
      frameDrops: this.frameDrops,
      memoryUsageBytes: this.memoryUsageBytes,
      loadedChunks: this.loadedChunks,
      renderedFeatures: this.renderedFeatures,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    });
  }

  logTable(): void {
    if (!this.enabled || typeof console.table !== 'function') {
      return;
    }
    console.table(this.getMetrics());
  }

  clear(): void {
    this.frameCount = 0;
    this.frameDrops = 0;
    this.fps = 0;
    this.renderDurationMs = 0;
    this.loadedChunks = 0;
    this.renderedFeatures = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  destroy(): void {
    this.stop();
    this.clear();
  }

  private start(): void {
    if (this.rafId !== null) {
      return;
    }
    const tick = (timestamp: number): void => {
      if (this.lastFrameAt > 0) {
        const delta = timestamp - this.lastFrameAt;
        if (delta > 32) {
          this.frameDrops += 1;
        }
        this.fps = Math.round(1000 / Math.max(delta, 1));
      }
      this.lastFrameAt = timestamp;
      this.frameCount += 1;
      this.rafId = globalThis.requestAnimationFrame(tick);
    };
    this.rafId = globalThis.requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.rafId !== null) {
      globalThis.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
