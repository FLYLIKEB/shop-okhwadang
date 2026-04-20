import { Module } from '@nestjs/common';
import { AuthEventEmitter } from './auth-event.emitter';

@Module({
  providers: [AuthEventEmitter],
  exports: [AuthEventEmitter],
})
export class AuthEventsModule {}
