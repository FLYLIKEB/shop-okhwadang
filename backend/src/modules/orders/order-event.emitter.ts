import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { OrderCompletedEvent, ORDER_COMPLETED_EVENT } from './events/order-completed.event';

@Injectable()
export class OrderEventEmitter {
  private readonly emitter = new EventEmitter();

  async emitOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    const handlers = this.emitter.listeners(ORDER_COMPLETED_EVENT) as Array<
      (event: OrderCompletedEvent) => void | Promise<void>
    >;
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  onOrderCompleted(handler: (event: OrderCompletedEvent) => void | Promise<void>): void {
    this.emitter.on(ORDER_COMPLETED_EVENT, handler);
  }
}
