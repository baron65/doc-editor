export class DraftSaveCoordinator<TSnapshot> {
  private pendingSnapshot?: TSnapshot;
  private failedSnapshot?: TSnapshot;
  private running?: Promise<void>;
  private lastError?: unknown;

  constructor(private readonly save: (snapshot: TSnapshot) => Promise<void>) {}

  enqueue(snapshot: TSnapshot): void {
    this.pendingSnapshot = snapshot;
    this.failedSnapshot = undefined;
    this.lastError = undefined;
    this.start();
  }

  async flush(): Promise<void> {
    this.start();
    await this.running;
    if (this.lastError) {
      throw this.lastError;
    }
  }

  async retry(): Promise<void> {
    if (this.failedSnapshot !== undefined) {
      this.pendingSnapshot = this.failedSnapshot;
      this.failedSnapshot = undefined;
    }
    this.lastError = undefined;
    this.start();
    await this.flush();
  }

  hasPendingWork(): boolean {
    return Boolean(this.running || this.pendingSnapshot !== undefined || this.failedSnapshot !== undefined);
  }

  private start(): void {
    if (this.running || this.pendingSnapshot === undefined) {
      return;
    }
    this.running = this.drain().finally(() => {
      this.running = undefined;
      if (this.pendingSnapshot !== undefined && !this.lastError) {
        this.start();
      }
    });
  }

  private async drain(): Promise<void> {
    while (this.pendingSnapshot !== undefined) {
      const snapshot = this.pendingSnapshot;
      this.pendingSnapshot = undefined;
      try {
        await this.save(snapshot);
      } catch (error) {
        this.failedSnapshot = this.pendingSnapshot ?? snapshot;
        this.pendingSnapshot = undefined;
        this.lastError = error;
        return;
      }
    }
  }
}
