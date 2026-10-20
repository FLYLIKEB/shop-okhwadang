import { BadRequestException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { Page } from '../entities/page.entity';
import { PageBlock } from '../entities/page-block.entity';
import { PagesService } from '../pages.service';
import { SavePageDraftDto } from '../dto/save-page-draft.dto';

describe('atomic page draft', () => {
  const dto = { title: 'draft', slug: 'draft', blocks: [{ id: -1, type: 'text_content', content: { html: 'new' }, sort_order: 0, is_visible: false }] };
  it('locks the page before obtaining current blocks and uses the idempotency transaction repositories', async () => {
    const calls: string[] = [];
    const page = { id: 1, slug: 'draft' };
    const pages = { findOne: jest.fn(async () => { calls.push('page-lock'); return page; }), update: jest.fn(), findOneOrFail: jest.fn().mockResolvedValue(page) };
    const query = {
      where: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementationOnce(async () => { calls.push('blocks-lock'); return [{ id: '4', page_id: 1 }]; }).mockResolvedValue([{ id: 8, is_visible: false }]),
    };
    const blocks = { createQueryBuilder: jest.fn(() => query), remove: jest.fn(), create: jest.fn((value: Partial<PageBlock>) => value), save: jest.fn(async (value: PageBlock) => ({ ...value, id: 8 })) };
    const manager = { getRepository: jest.fn((entity: unknown) => entity === Page ? pages : blocks) };
    const execute = jest.fn(async (_scope: string, _operation: string, _key: string, _payload: unknown, work: (transaction: EntityManager) => Promise<Page>) => ({ result: await work(manager as unknown as EntityManager), replayed: false }));
    const service = new PagesService({} as Repository<Page>, {} as Repository<PageBlock>, { execute } as unknown as IdempotencyService);
    const saved = await service.saveDraft(1, 2, 'key', dto);
    expect(calls).toEqual(['page-lock', 'blocks-lock']);
    expect(pages.findOne).toHaveBeenCalledWith({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
    expect(query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(blocks.remove).toHaveBeenCalledWith([{ id: '4', page_id: 1 }]);
    expect(saved.blocks[0]).toEqual(expect.objectContaining({ id: 8, is_visible: false }));
    expect(execute).toHaveBeenCalledWith('page:1:actor:2', 'cms-draft-save', 'key', dto, expect.any(Function));
  });

  it.each([
    { ...dto, title: '' }, { ...dto, is_published: null },
    { ...dto, blocks: [{ ...dto.blocks[0], content: [] }] },
    { ...dto, blocks: [{ ...dto.blocks[0], id: '4' }] },
    { ...dto, blocks: [{ ...dto.blocks[0], is_visible: null }] },
  ])('rejects invalid snapshot structure %j', async (invalid) => {
    expect(await validate(plainToInstance(SavePageDraftDto, invalid))).not.toHaveLength(0);
  });

  it('rejects unsupported content before deleting any existing blocks', async () => {
    const query = { where: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    const blocks = { createQueryBuilder: jest.fn(() => query), remove: jest.fn() };
    const manager = { getRepository: jest.fn((entity: unknown) => entity === Page ? { findOne: jest.fn().mockResolvedValue({ id: 1 }) } : blocks) };
    const execute = jest.fn(async (_scope: string, _operation: string, _key: string, _payload: unknown, work: (transaction: EntityManager) => Promise<Page>) => ({ result: await work(manager as unknown as EntityManager), replayed: false }));
    const service = new PagesService({} as Repository<Page>, {} as Repository<PageBlock>, { execute } as unknown as IdempotencyService);
    await expect(service.saveDraft(1, 2, 'invalid', { ...dto, blocks: [{ ...dto.blocks[0], type: 'timeline_list', content: {} }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(blocks.remove).not.toHaveBeenCalled();
  });
});
