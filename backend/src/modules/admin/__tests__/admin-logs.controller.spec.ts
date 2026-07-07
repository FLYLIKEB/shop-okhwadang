import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AdminLogsController } from '../admin-logs.controller';
import { AdminLogsService } from '../admin-logs.service';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('AdminLogsController access policy', () => {
  it('limits remote log lookup API to super_admin only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminLogsController)).toEqual(['super_admin']);
  });

  it('blocks regular admin from remote log lookup', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => AdminLogsController.prototype.getLogs,
      getClass: () => AdminLogsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 7, role: 'admin' } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });

  it('delegates query values to the service', async () => {
    const service = {
      getLogs: jest.fn().mockResolvedValue({ content: 'ok' }),
    } as unknown as AdminLogsService;
    const controller = new AdminLogsController(service);

    await expect(controller.getLogs({ type: 'error', lines: 100 })).resolves.toEqual({ content: 'ok' });
    expect(service.getLogs).toHaveBeenCalledWith('error', 100);
  });
});
