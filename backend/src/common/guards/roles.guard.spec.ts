import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(role: string): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role } }),
      }),
    } as unknown as ExecutionContext;
  }

  function createUnauthenticatedContext(): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('no @Roles() decorator', () => {
    it('should return true (publicly accessible)', () => {
      const ctx = createMockContext('user');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('@Roles("admin") endpoint', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    });

    it('should return false for user role', () => {
      const ctx = createMockContext('user');
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('should return true for admin role', () => {
      const ctx = createMockContext('admin');
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true for super_admin (hierarchical)', () => {
      const ctx = createMockContext('super_admin');
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('@Roles("user") endpoint', () => {
    it('should return true for user role', () => {
      const ctx = createMockContext('user');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('unauthenticated user (no JWT)', () => {
    it('should return false when user is undefined on a protected route', () => {
      const ctx = createUnauthenticatedContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });
});
