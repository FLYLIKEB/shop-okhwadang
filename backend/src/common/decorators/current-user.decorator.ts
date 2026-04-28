import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAuthUser } from '../interfaces/auth-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<RequestWithAuthUser>().user;
  },
);
