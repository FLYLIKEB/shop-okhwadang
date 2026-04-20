import { Module } from '@nestjs/common';
import { OrderEventEmitter } from './order-event.emitter';

@Module({
  providers: [OrderEventEmitter],
  exports: [OrderEventEmitter],
})
export class OrderEventsModule {}
