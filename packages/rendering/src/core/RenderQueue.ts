export type RenderPriority = 'boundaries' | 'roads' | 'water' | 'buildings' | 'poi';

export interface RenderTask {
  readonly id: string;
  readonly priority: RenderPriority;
  readonly generation: number;
  readonly run: () => Promise<void> | void;
}

const PRIORITY_ORDER: Record<RenderPriority, number> = {
  boundaries: 0,
  roads: 1,
  water: 2,
  buildings: 3,
  poi: 4,
};

/**
 * Debounced priority render queue that cancels outdated viewport work.
 */
export class RenderQueue {
  private generation = 0;
  private pending: RenderTask[] = [];
  private running = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(debounceMs = 120) {
    this.debounceMs = debounceMs;
  }

  get currentGeneration(): number {
    return this.generation;
  }

  bumpGeneration(): number {
    this.generation += 1;
    this.pending = this.pending.filter((task) => task.generation === this.generation);
    return this.generation;
  }

  enqueue(task: RenderTask): void {
    this.pending.push(task);
    this.pending.sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]);
    void this.flush();
  }

  scheduleViewportUpdate(run: (generation: number) => Promise<void> | void): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    const generation = this.bumpGeneration();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.enqueue({
        id: `viewport:${generation}`,
        priority: 'roads',
        generation,
        run: () => run(generation),
      });
    }, this.debounceMs);
  }

  cancelOutdated(): void {
    this.bumpGeneration();
    this.pending = [];
  }

  async flush(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    while (this.pending.length > 0) {
      const task = this.pending.shift();
      if (!task || task.generation !== this.generation) {
        continue;
      }
      await task.run();
    }
    this.running = false;
  }

  clear(): void {
    this.cancelOutdated();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
