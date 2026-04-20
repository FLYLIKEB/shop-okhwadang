import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { OrderCompletedEvent, ORDER_COMPLETED_EVENT } from './events/order-completed.event';

@Injectable()
export class OrderEventEmitter {
  private readonly emitter = new EventEmitter();

  emitOrderCompleted(event: OrderCompletedEvent): void {
    this.emitter.emit(ORDER_COMPLETED_EVENT, event);
  }

  onOrderCompleted(handler: (event: OrderCompletedEvent) => void): void {
    this.emitter.on(ORDER_COMPLETED_EVENT, handler);
  }
}
