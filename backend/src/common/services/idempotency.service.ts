import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { IdempotencyOperation } from '../entities/idempotency-operation.entity';

class PendingOperationError extends Error {}

@Injectable()
export class IdempotencyService {
  // PayPal and Eximbay confirmation can perform two sequential 8-second calls.
  // Keep ownership beyond the full provider workflow plus local finalization.
  private static readonly LEASE_MS = 30_000;
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(scope: string, operation: string, key: string | undefined, payload: unknown, work: (manager: EntityManager) => Promise<T>): Promise<{ result: T; replayed: boolean }> {
    if (!key || !key.trim() || key.length > 255) throw new BadRequestException('Idempotency-Key 헤더가 필요합니다.');
    const normalizedKey = key.trim();
    const fingerprint = createHash('sha256').update(stableStringify(payload)).digest('hex');
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(IdempotencyOperation);
        const existing = await repository.findOne({
          where: { scope, operation, key: normalizedKey },
        });
        if (existing) {
          this.assertFingerprint(existing, fingerprint);
          return { result: existing.result as T, replayed: true };
        }
        const record = await repository.save(repository.create({ scope, operation, key: normalizedKey, fingerprint, status: 'completed', result: {} }));
        const result = await work(manager);
        record.result = result;
        await repository.save(record);
        return { result, replayed: false };
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const existing = await this.dataSource.getRepository(IdempotencyOperation).findOne({ where: { scope, operation, key: normalizedKey } });
      if (!existing) throw error;
      this.assertFingerprint(existing, fingerprint);
      return { result: existing.result as T, replayed: true };
    }
  }

  async reserve<T>(scope: string, operation: string, key: string | undefined, payload: unknown): Promise<
    { id: number; leaseOwner: string | null; owner: boolean; replayed: boolean; result?: T }
  > {
    if (!key || !key.trim() || key.length > 255) throw new BadRequestException('Idempotency-Key 헤더가 필요합니다.');
    const normalizedKey = key.trim();
    const fingerprint = createHash('sha256').update(stableStringify(payload)).digest('hex');
    const owner = randomUUID();
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(IdempotencyOperation);
        const existing = await repository.findOne({
          where: { scope, operation, key: normalizedKey },
        });
        if (existing) {
          this.assertFingerprint(existing, fingerprint);
          if (existing.status !== 'completed') {
            if (!existing.leaseExpiresAt || existing.leaseExpiresAt <= new Date()) {
              existing.leaseOwner = owner;
              existing.leaseExpiresAt = new Date(Date.now() + IdempotencyService.LEASE_MS);
              await repository.save(existing);
              return { id: existing.id, leaseOwner: owner, owner: true, replayed: false };
            }
            throw new PendingOperationError();
          }
          return {
            id: existing.id,
            leaseOwner: null,
            owner: false,
            replayed: existing.status === 'completed',
            ...(existing.status === 'completed' ? { result: existing.result as T } : {}),
          };
        }
        const record = await repository.save(repository.create({
          scope, operation, key: normalizedKey, fingerprint, status: 'pending', leaseOwner: owner,
          leaseExpiresAt: new Date(Date.now() + IdempotencyService.LEASE_MS), result: {},
        }));
        return { id: record.id, leaseOwner: owner, owner: true, replayed: false };
      });
    } catch (error) {
      if (error instanceof PendingOperationError) {
        return this.waitOrTakeover<T>(scope, operation, normalizedKey, fingerprint, owner);
      }
      if (!isDuplicateKeyError(error)) throw error;
      return this.waitOrTakeover<T>(scope, operation, normalizedKey, fingerprint, owner);
    }
  }

  async complete<T>(manager: EntityManager, id: number, leaseOwner: string, result: T): Promise<void> {
    const update = await manager.getRepository(IdempotencyOperation).update({ id, status: 'pending', leaseOwner }, {
      status: 'completed',
      result: result as never,
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    if (update.affected !== 1) throw new ConflictException('요청 처리 권한이 만료되었습니다.');
  }

  async renew(manager: EntityManager, id: number, leaseOwner: string): Promise<void> {
    const update = await manager.getRepository(IdempotencyOperation).update(
      { id, status: 'pending', leaseOwner },
      { leaseExpiresAt: new Date(Date.now() + IdempotencyService.LEASE_MS) },
    );
    if (update.affected !== 1) throw new ConflictException('요청 처리 권한이 만료되었습니다.');
  }

  async renewLease(id: number, leaseOwner: string): Promise<void> {
    await this.dataSource.transaction((manager) => this.renew(manager, id, leaseOwner));
  }

  private async waitOrTakeover<T>(scope: string, operation: string, key: string, fingerprint: string, owner: string): Promise<{ id: number; leaseOwner: string | null; owner: boolean; replayed: boolean; result?: T }> {
    while (true) {
      const outcome = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(IdempotencyOperation);
        const existing = await repository.findOne({ where: { scope, operation, key }, lock: { mode: 'pessimistic_write' } });
        if (!existing) return null;
        this.assertFingerprint(existing, fingerprint);
        if (existing.status === 'completed') return { id: existing.id, leaseOwner: null, owner: false, replayed: true, result: existing.result as T };
        if (!existing.leaseExpiresAt || existing.leaseExpiresAt <= new Date()) {
          existing.leaseOwner = owner;
          existing.leaseExpiresAt = new Date(Date.now() + IdempotencyService.LEASE_MS);
          await repository.save(existing);
          return { id: existing.id, leaseOwner: owner, owner: true, replayed: false };
        }
        return { id: existing.id, leaseOwner: null, owner: false, replayed: false };
      });
      if (outcome?.replayed || outcome?.owner) return outcome;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private assertFingerprint(existing: IdempotencyOperation, fingerprint: string): void {
    if (existing.fingerprint !== fingerprint) throw new ConflictException('동일한 Idempotency-Key에 다른 요청을 사용할 수 없습니다.');
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY';
}
