interface LruEntry<TValue> {
  readonly key: string;
  value: TValue;
  bytes: number;
  prev: string | null;
  next: string | null;
}

/**
 * Byte-budget LRU cache with O(1) get/set/evict.
 */
export class LruCache<TValue> {
  private readonly entries = new Map<string, LruEntry<TValue>>();
  private head: string | null = null;
  private tail: string | null = null;
  private totalBytes = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxBytes: number,
    private readonly estimateBytes: (value: TValue) => number,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): TValue | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    this.moveToHead(entry.key);
    return entry.value;
  }

  set(key: string, value: TValue): void {
    const bytes = this.estimateBytes(value);
    const existing = this.entries.get(key);
    if (existing) {
      this.totalBytes -= existing.bytes;
      existing.value = value;
      existing.bytes = bytes;
      this.totalBytes += bytes;
      this.moveToHead(key);
      this.evictIfNeeded();
      return;
    }

    const entry: LruEntry<TValue> = {
      key,
      value,
      bytes,
      prev: null,
      next: this.head,
    };
    if (this.head) {
      const headEntry = this.entries.get(this.head);
      if (headEntry) {
        headEntry.prev = key;
      }
    } else {
      this.tail = key;
    }
    this.head = key;
    this.entries.set(key, entry);
    this.totalBytes += bytes;
    this.evictIfNeeded();
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }
    this.removeEntry(entry);
    return true;
  }

  clear(): void {
    this.entries.clear();
    this.head = null;
    this.tail = null;
    this.totalBytes = 0;
  }

  private evictIfNeeded(): void {
    while (
      (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) &&
      this.tail
    ) {
      const tailEntry = this.entries.get(this.tail);
      if (!tailEntry) {
        break;
      }
      this.removeEntry(tailEntry);
    }
  }

  private removeEntry(entry: LruEntry<TValue>): void {
    const prev = entry.prev;
    const next = entry.next;
    if (prev) {
      const prevEntry = this.entries.get(prev);
      if (prevEntry) {
        prevEntry.next = next;
      }
    } else {
      this.head = next;
    }
    if (next) {
      const nextEntry = this.entries.get(next);
      if (nextEntry) {
        nextEntry.prev = prev;
      }
    } else {
      this.tail = prev;
    }
    this.entries.delete(entry.key);
    this.totalBytes -= entry.bytes;
  }

  private moveToHead(key: string): void {
    const entry = this.entries.get(key);
    if (!entry || this.head === key) {
      return;
    }

    const prev = entry.prev;
    const next = entry.next;
    if (prev) {
      const prevEntry = this.entries.get(prev);
      if (prevEntry) {
        prevEntry.next = next;
      }
    }
    if (next) {
      const nextEntry = this.entries.get(next);
      if (nextEntry) {
        nextEntry.prev = prev;
      }
    } else {
      this.tail = prev;
    }

    entry.prev = null;
    entry.next = this.head;
    if (this.head) {
      const headEntry = this.entries.get(this.head);
      if (headEntry) {
        headEntry.prev = key;
      }
    }
    this.head = key;
  }
}
