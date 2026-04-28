import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { UserRegisteredEvent, USER_REGISTERED_EVENT } from './events/user-registered.event';

@Injectable()
export class AuthEventEmitter {
  private readonly emitter = new EventEmitter();

  emitUserRegistered(event: UserRegisteredEvent): void {
    this.emitter.emit(USER_REGISTERED_EVENT, event);
  }

  onUserRegistered(handler: (event: UserRegisteredEvent) => void): void {
    this.emitter.on(USER_REGISTERED_EVENT, handler);
  }
}
