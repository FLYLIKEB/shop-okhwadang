import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AuditLogController } from '../audit-log.controller';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('AuditLogController access policy', () => {
  it('limits audit log lookup API to super_admin only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditLogController)).toEqual(['super_admin']);
  });

  it('blocks regular admin from full audit log lookup', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => AuditLogController.prototype.findAll,
      getClass: () => AuditLogController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 7, role: 'admin' } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
