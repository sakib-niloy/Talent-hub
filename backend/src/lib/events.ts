// Minimal typed in-process event bus. Decouples side effects (storage cleanup, future
// notifications) from request handlers; can be swapped for a queue without touching publishers.
import { EventEmitter } from 'node:events';

export interface DomainEvents {
  'media.deleted': { mediaId: number; storageKey: string };
  'user.blocked': { userId: number };
}

export class EventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof DomainEvents>(event: K, handler: (payload: DomainEvents[K]) => void | Promise<void>): void {
    this.emitter.on(event, (payload: DomainEvents[K]) => {
      Promise.resolve(handler(payload)).catch((err) => this.emitter.emit('error', err));
    });
  }

  onError(handler: (err: unknown) => void): void {
    this.emitter.on('error', handler);
  }
}
