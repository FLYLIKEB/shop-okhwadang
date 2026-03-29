import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createMockContext(overrides: { isPublic?: boolean; user?: object } = {}): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: overrides.user ?? null,
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('@Public() endpoint', () => {
    it('should return true without JWT validation', () => {
      const ctx = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });
  });

  describe('protected endpoint', () => {
    it('should call super.canActivate when not public', () => {
      const ctx = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(superCanActivate).toHaveBeenCalledWith(ctx);
    });

    it('should delegate to passport when isPublic is undefined', () => {
      const ctx = createMockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockReturnValue(false);

      const result = guard.canActivate(ctx);

      expect(result).toBe(false);
    });
  });
});
