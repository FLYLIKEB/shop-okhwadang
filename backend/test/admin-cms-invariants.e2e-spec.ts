import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { IdempotencyOperation } from '../src/common/entities/idempotency-operation.entity';
import { IdempotencyService } from '../src/common/services/idempotency.service';
import { Page } from '../src/modules/pages/entities/page.entity';
import { PageBlock } from '../src/modules/pages/entities/page-block.entity';
import { PagesService } from '../src/modules/pages/pages.service';
import { SavePageDraftDto } from '../src/modules/pages/dto/save-page-draft.dto';

describe('admin atomic CMS invariants (MySQL)', () => {
  let db: DataSource;
  let service: PagesService;
  const ids: number[] = [];
  const run = `cms-audit-${Date.now()}`;
  let serial = 0;

  beforeAll(async () => {
    const url = process.env.DATABASE_URL!;
    if (!new URL(url).pathname.endsWith('_test')) throw new Error('CMS tests require a dedicated _test database');
    db = await new DataSource({ type: 'mysql', url, entities: [Page, PageBlock, IdempotencyOperation], synchronize: false }).initialize();
    service = new PagesService(db.getRepository(Page), db.getRepository(PageBlock), new IdempotencyService(db));
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (db?.isInitialized) {
      for (const id of ids) await db.getRepository(IdempotencyOperation).delete({ scope: `page:${id}:actor:1` });
      if (ids.length) await db.getRepository(Page).delete({ id: In(ids) });
      await db.destroy();
    }
  });

  async function fixture() {
    const page = await db.getRepository(Page).save(db.getRepository(Page).create({ title: 'original', slug: `${run}-${++serial}`, is_published: false }));
    ids.push(Number(page.id));
    const block = await db.getRepository(PageBlock).save(db.getRepository(PageBlock).create({ page_id: Number(page.id), type: 'text_content', content: { html: 'original' }, sort_order: 0, is_visible: false }));
    return { page, block };
  }

  function draft(slug: string, label: string, count = 2): SavePageDraftDto {
    return { title: label, slug, is_published: true, blocks: Array.from({ length: count }, (_, index) => ({
      id: -index - 1, type: 'text_content', content: { html: `${label}-${index}` }, sort_order: index, is_visible: index > 0,
    })) };
  }

  it('saves a complete ordered hidden-inclusive snapshot and replays a lost response without duplicate blocks', async () => {
    const { page, block } = await fixture();
    const payload = draft(page.slug, 'saved');
    payload.blocks = [payload.blocks[0], { id: Number(block.id), type: block.type, content: { html: 'updated' }, sort_order: 1, is_visible: false }, payload.blocks[1]];
    payload.blocks[2].sort_order = 2;
    const saved = await service.saveDraft(Number(page.id), 1, 'response-loss', payload);
    const replayed = await service.saveDraft(Number(page.id), 1, 'response-loss', payload);
    expect(JSON.parse(JSON.stringify(replayed))).toEqual(JSON.parse(JSON.stringify(saved)));
    const actual = await service.findOneAdmin(Number(page.id));
    expect(actual.title).toBe('saved');
    expect(actual.is_published).toBe(true);
    expect(actual.blocks.map((entry) => entry.content.html)).toEqual(['saved-0', 'updated', 'saved-1']);
    expect(actual.blocks.filter((entry) => !entry.is_visible)).toHaveLength(2);
    await expect(service.saveDraft(Number(page.id), 1, 'response-loss', { ...payload, title: 'different' })).rejects.toBeInstanceOf(ConflictException);
    expect(await db.getRepository(PageBlock).countBy({ page_id: Number(page.id) })).toBe(3);
  });

  it('rolls back removed, created and modified blocks plus metadata/publication on a late failure', async () => {
    const { page, block } = await fixture();
    await db.getRepository(PageBlock).save(db.getRepository(PageBlock).create({ page_id: Number(page.id), type: 'text_content', content: { html: 'removed' }, sort_order: 1, is_visible: true }));
    const before = await service.findOneAdmin(Number(page.id));
    const payload = draft(page.slug, 'failed');
    payload.blocks[1] = { ...payload.blocks[1], id: Number(block.id), content: { html: 'changed' } };
    const originalUpdate = Repository.prototype.update;
    const spy = jest.spyOn(Repository.prototype, 'update').mockImplementation(function (this: Repository<Page>, ...args: Parameters<typeof originalUpdate>) {
      if (this.metadata.target === Page) throw new Error('late metadata failure');
      return originalUpdate.apply(this, args);
    });
    await expect(service.saveDraft(Number(page.id), 1, 'rollback', payload)).rejects.toThrow('late metadata failure');
    spy.mockRestore();
    expect(await service.findOneAdmin(Number(page.id))).toEqual(before);
    expect(await db.getRepository(IdempotencyOperation).countBy({ scope: `page:${page.id}:actor:1` })).toBe(0);
    await service.saveDraft(Number(page.id), 1, 'rollback', payload);
    expect((await service.findOneAdmin(Number(page.id))).title).toBe('failed');
  });

  it('rejects foreign and duplicate block IDs before changing the snapshot', async () => {
    const { page, block } = await fixture();
    const other = await fixture();
    const before = await service.findOneAdmin(Number(page.id));
    const payload = draft(page.slug, 'invalid');
    for (const blockIds of [[Number(block.id), Number(block.id)], [Number(other.block.id)], [-1, -1], [0]]) {
      const invalid = { ...payload, blocks: blockIds.map((id) => ({ ...payload.blocks[0], id })) };
      await expect(service.saveDraft(Number(page.id), 1, `invalid-${blockIds.join(',')}`, invalid)).rejects.toBeInstanceOf(BadRequestException);
      expect(await service.findOneAdmin(Number(page.id))).toEqual(before);
    }
  });

  it('serializes distinct-key snapshots after both idempotency prereads establish REPEATABLE READ snapshots', async () => {
    const { page, block } = await fixture();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let releaseSecond!: () => void;
    const firstPageLocked = new Promise<void>((resolve) => { releaseSecond = resolve; });
    let reads = 0;
    const connectionIds = new Set<number>();
    const originalFindOne = Repository.prototype.findOne;
    const spy = jest.spyOn(Repository.prototype, 'findOne').mockImplementation(async function (this: Repository<IdempotencyOperation>, options) {
      const result = await originalFindOne.call(this, options);
      if (this.metadata.target === IdempotencyOperation && !result) {
        const where = options?.where as { key?: string };
        const rows = await this.manager.query('SELECT CONNECTION_ID() AS id, @@transaction_isolation AS isolation') as Array<{ id: number; isolation: string }>;
        expect(rows[0].isolation).toBe('REPEATABLE-READ');
        connectionIds.add(rows[0].id);
        reads += 1;
        if (reads === 2) release();
        await barrier;
        if (where.key === 'concurrent-1') await firstPageLocked;
      }
      if (this.metadata.target === Page) releaseSecond();
      return result;
    });
    const drafts = [draft(page.slug, 'A', 2), draft(page.slug, 'B', 3)];
    drafts[0].blocks[0].id = Number(block.id);
    drafts[1].title = page.title;
    drafts[1].is_published = false;
    drafts[1].blocks[0] = { ...drafts[1].blocks[0], id: Number(block.id), content: block.content };
    const saved = await Promise.all(drafts.map((payload, index) => service.saveDraft(Number(page.id), 1, `concurrent-${index}`, payload)));
    spy.mockRestore();
    expect(reads).toBe(2);
    expect(connectionIds.size).toBe(2);
    const actual = await service.findOneAdmin(Number(page.id));
    expect(actual.title).toBe(page.title);
    expect(actual.is_published).toBe(false);
    const winningDraft = drafts.find((payload) => payload.title === actual.title)!;
    expect(actual.blocks.map((block) => ({ content: block.content, sort_order: block.sort_order, is_visible: block.is_visible })))
      .toEqual(winningDraft.blocks.map(({ content, sort_order, is_visible }) => ({ content, sort_order, is_visible })));
    expect(actual.blocks.map((block) => Number(block.id))).toEqual(saved.find((entry) => entry.title === actual.title)!.blocks.map((block) => Number(block.id)));
  });
});
