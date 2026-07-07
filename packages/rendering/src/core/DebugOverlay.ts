import type { PerformanceMetrics } from './PerformanceMonitor.js';
import type { MemoryStats } from './MemoryManager.js';

export interface DebugOverlayState {
  readonly zoom: number;
  readonly visibleFeatures: number;
  readonly loadedChunks: number;
  readonly fps: number;
  readonly memoryBytes: number;
  readonly renderedLayers: readonly string[];
}

/**
 * Optional development overlay for streaming diagnostics.
 */
export class DebugOverlay {
  private readonly element: HTMLDivElement;
  private visible = false;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '8px';
    this.element.style.left = '8px';
    this.element.style.zIndex = '10';
    this.element.style.padding = '8px 10px';
    this.element.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    this.element.style.fontSize = '12px';
    this.element.style.lineHeight = '1.4';
    this.element.style.background = 'rgba(0, 0, 0, 0.72)';
    this.element.style.color = '#f9fafb';
    this.element.style.borderRadius = '6px';
    this.element.style.pointerEvents = 'none';
    this.element.style.display = 'none';
    container.style.position = container.style.position || 'relative';
    container.appendChild(this.element);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.style.display = visible ? 'block' : 'none';
  }

  update(
    metrics: PerformanceMetrics,
    memory: MemoryStats,
    state: DebugOverlayState,
  ): void {
    if (!this.visible) {
      return;
    }
    this.element.textContent = [
      `Zoom: ${state.zoom.toFixed(2)}`,
      `Visible Features: ${state.visibleFeatures}`,
      `Loaded Chunks: ${state.loadedChunks}`,
      `FPS: ${metrics.fps}`,
      `Memory: ${(state.memoryBytes / (1024 * 1024)).toFixed(2)} MB`,
      `Rendered Layers: ${state.renderedLayers.join(', ')}`,
      `Cache hit: ${metrics.cacheHits}/${metrics.cacheHits + metrics.cacheMisses}`,
    ].join('\n');
  }

  destroy(): void {
    this.element.remove();
  }
}
