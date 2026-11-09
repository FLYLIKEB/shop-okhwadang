import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CacheService } from '../../cache/cache.service';
import { PagesService } from '../pages.service';
import { Page } from '../entities/page.entity';
import { PageBlock } from '../entities/page-block.entity';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { JournalService } from '../../journal/journal.service';
import { JournalCategory, JournalEntry } from '../../journal/entities/journal-entry.entity';

describe('public CMS origin cache', () => {
  it('reuses page reads for 60 seconds and invalidates every locale after withdrawal', async () => {
    const page = { id: 1, slug: 'home', title: 'Home', titleEn: 'English', is_published: true, blocks: [] };
    const findOne = jest.fn().mockImplementation(async ({ where }) => where.is_published && !page.is_published ? null : structuredClone(page));
    const save = jest.fn().mockImplementation(async (value) => Object.assign(page, value));
    const service = new PagesService({ findOne, save } as unknown as Repository<Page>, {} as Repository<PageBlock>, {} as IdempotencyService, new CacheService());
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      await service.findBySlug('home', 'ko');
      await service.findBySlug('home', 'ko');
      expect(findOne).toHaveBeenCalledTimes(1);
      clock.mockReturnValue(61001);
      await service.findBySlug('home', 'ko');
      expect(findOne).toHaveBeenCalledTimes(2);
      await service.findBySlug('home', 'en');
      await service.update(1, { is_published: false });
      await expect(service.findBySlug('home', 'ko')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.findBySlug('home', 'en')).rejects.toBeInstanceOf(NotFoundException);
    } finally { clock.mockRestore(); }
  });

  it('does not repopulate the cache with an in-flight read predating a mutation', async () => {
    let finishRead!: (entries: JournalEntry[]) => void;
    const staleRead = new Promise<JournalEntry[]>((resolve) => { finishRead = resolve; });
    const find = jest.fn().mockReturnValueOnce(staleRead).mockResolvedValue([]);
    const service = new JournalService({
      find, findOne: jest.fn().mockResolvedValue({ id: 1 }), remove: jest.fn().mockResolvedValue(undefined),
    } as unknown as Repository<JournalEntry>, new CacheService());
    const pending = service.findAll();
    await Promise.resolve();
    await service.delete(1);
    finishRead([{ id: 1, title: 'Withdrawn' } as JournalEntry]);
    await pending;
    expect(await service.findAll()).toEqual([]);
    expect(find).toHaveBeenCalledTimes(2);
  });

  it('rejects unknown categories before they can collide with or grow public list cache keys', async () => {
    const cache = new CacheService();
    const get = jest.spyOn(cache, 'get');
    const find = jest.fn().mockResolvedValue([{ id: 1 }]);
    const service = new JournalService({ find } as unknown as Repository<JournalEntry>, cache);
    for (const category of ['all', '', 'arbitrary-category']) {
      await expect(service.findAll(category as JournalCategory)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(get).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
    expect(await service.findAll()).toEqual([{ id: 1 }]);
    expect(await service.findAll()).toEqual([{ id: 1 }]);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached journal lists and details immediately after edits and deletion', async () => {
    let entry: Partial<JournalEntry> | null = { id: 1, slug: 'story', title: 'Original', isPublished: true };
    const find = jest.fn().mockImplementation(async () => entry ? [structuredClone(entry)] : []);
    const findOne = jest.fn().mockImplementation(async () => structuredClone(entry));
    const save = jest.fn().mockImplementation(async (value) => entry = value);
    const remove = jest.fn().mockImplementation(async () => { entry = null; });
    const service = new JournalService({ find, findOne, save, remove } as unknown as Repository<JournalEntry>, new CacheService());
    await service.findAll(undefined, 'ko');
    await service.findAll(undefined, 'ko');
    await service.findBySlug('story', 'ko');
    await service.findBySlug('story', 'ko');
    expect(find).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(1);
    await service.update(1, { title: 'Edited' });
    expect((await service.findAll(undefined, 'ko'))[0].title).toBe('Edited');
    expect((await service.findBySlug('story', 'ko')).title).toBe('Edited');
    await service.delete(1);
    expect(await service.findAll(undefined, 'ko')).toEqual([]);
    await expect(service.findBySlug('story', 'ko')).rejects.toBeInstanceOf(NotFoundException);
  });
});
