import { INestApplication, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AdminMembersService } from '../src/modules/admin/admin-members.service';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { Inquiry, InquiryType } from '../src/modules/inquiries/entities/inquiry.entity';
import { InquiriesService } from '../src/modules/inquiries/inquiries.service';
import { PointsService } from '../src/modules/points/points.service';
import { PointHistory } from '../src/modules/coupons/entities/point-history.entity';
import { AuditLog } from '../src/modules/audit-logs/entities/audit-log.entity';

describe('admin customer invariants (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  const ids: number[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DataSource);
  });

  afterAll(async () => {
    if (ids.length) await db.getRepository(AuditLog).delete({ actorId: In(ids) });
    if (ids.length) await db.getRepository(PointHistory).delete({ userId: In(ids) });
    if (ids.length) await db.getRepository(Inquiry).delete({ userId: In(ids) });
    if (ids.length) await db.getRepository(User).delete({ id: In(ids) });
    await app?.close();
  });

  it('rejects overflow of actual summed MySQL point credits with HTTP 400 semantics and no ledger or audit writes', async () => {
    const users = db.getRepository(User);
    const member = await users.save(users.create({
      email: `admin-point-bounds-${Date.now()}@example.test`,
      name: 'Point bounds fixture', role: UserRole.ADMIN,
    }));
    const userId = Number(member.id);
    ids.push(userId);
    const history = db.getRepository(PointHistory);
    await history.save([0, 1].map(() => history.create({
      userId, type: 'earn', amount: 1073741820, remainingAmount: 1073741820,
      balance: 1073741820, description: 'Point bounds fixture', expiresAt: null,
    })));
    const ledgerBefore = await history.find({ where: { userId }, order: { id: 'ASC' } });
    const auditsBefore = await db.getRepository(AuditLog).count({ where: { actorId: userId } });
    const points = app.get(PointsService);
    expect(await points.getEffectiveBalanceInTx(db.manager, userId)).toBe(2147483640);

    for (const delta of [8, 2147483648]) {
      const adjustment = points.adjustPointsManually(
        { actorId: userId, actorRole: UserRole.ADMIN },
        { userId, delta, reason: 'Point bounds fixture' },
      );
      await expect(adjustment).rejects.toBeInstanceOf(BadRequestException);
      await expect(adjustment).rejects.toMatchObject({ status: 400 });
      expect(await history.find({ where: { userId }, order: { id: 'ASC' } })).toEqual(ledgerBefore);
      expect(await db.getRepository(AuditLog).count({ where: { actorId: userId } })).toBe(auditsBefore);
    }
  });

  it('serializes real inquiry user relations through an explicit allowlist', async () => {
    const users = db.getRepository(User);
    const member = await users.save(users.create({
      email: `admin-inquiry-${Date.now()}@example.test`, name: 'Inquiry fixture',
      password: 'fixture-password-hash', refreshToken: 'fixture-refresh-token',
    }));
    ids.push(Number(member.id));
    const inquiry = await db.getRepository(Inquiry).save({
      userId: Number(member.id), type: InquiryType.OTHER, title: 'Fixture', content: 'Fixture',
    });
    const response = await app.get(InquiriesService).findAllForAdmin({ limit: 100 });
    const row = response.items.find((item) => Number(item.id) === Number(inquiry.id));
    expect(row).toBeDefined();
    expect(JSON.parse(JSON.stringify(row)).user).toEqual({
      id: member.id, name: member.name, email: member.email,
    });
  });

  it('serializes mutual demotion across distinct MySQL connections and rejects stale actor privilege', async () => {
    const users = db.getRepository(User);
    const fixture = await users.save(
      [0, 1].map((index) =>
        users.create({
          email: `admin-role-${Date.now()}-${index}@example.test`,
          name: 'Role concurrency fixture',
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        }),
      ),
    );
    const roleIds = fixture.map((user) => Number(user.id));
    ids.push(...roleIds);
    const runners = [db.createQueryRunner(), db.createQueryRunner()];
    await Promise.all(runners.map((runner) => runner.connect()));
    try {
      const connections = await Promise.all(
        runners.map(
          (runner) =>
            runner.query('SELECT CONNECTION_ID() AS id') as Promise<Array<{ id: number }>>,
        ),
      );
      expect(connections[0][0].id).not.toBe(connections[1][0].id);
      const services = runners.map(
        (runner) => new AdminMembersService(runner.manager.getRepository(User)),
      );
      const results = await Promise.allSettled([
        services[0].updateRole(roleIds[1], UserRole.USER, roleIds[0], UserRole.SUPER_ADMIN),
        services[1].updateRole(roleIds[0], UserRole.USER, roleIds[1], UserRole.SUPER_ADMIN),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(ForbiddenException);
      const remaining = await users.find({ where: { id: In(roleIds) } });
      expect(remaining.filter((user) => user.role === UserRole.SUPER_ADMIN)).toHaveLength(1);
      const demoted = remaining.find((user) => user.role === UserRole.USER)!;
      const privileged = remaining.find((user) => user.role === UserRole.SUPER_ADMIN)!;
      await expect(
        services[0].updateRole(
          Number(privileged.id),
          UserRole.USER,
          Number(demoted.id),
          UserRole.SUPER_ADMIN,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    } finally {
      await Promise.all(runners.map((runner) => runner.release()));
    }
  });
});
