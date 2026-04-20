export class UserRegisteredEvent {
  constructor(
    public readonly userId: number,
    public readonly email: string,
  ) {}
}

export const USER_REGISTERED_EVENT = 'auth.user_registered';
