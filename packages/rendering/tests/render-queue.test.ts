import { describe, expect, it, vi } from 'vitest';

import { RenderQueue } from '../src/core/RenderQueue.js';

describe('RenderQueue', () => {
  it('debounces viewport updates and cancels outdated generations', async () => {
    vi.useFakeTimers();
    const queue = new RenderQueue(50);
    const runs: number[] = [];

    queue.scheduleViewportUpdate(async (generation) => {
      runs.push(generation);
    });
    queue.scheduleViewportUpdate(async (generation) => {
      runs.push(generation);
    });

    vi.advanceTimersByTime(60);
    await queue.flush();

    expect(runs.length).toBe(1);
    vi.useRealTimers();
  });
});
