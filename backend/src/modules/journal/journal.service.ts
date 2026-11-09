import { CacheService } from '../cache/cache.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry, JournalCategory } from './entities/journal-entry.entity';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';

const I18N_FIELDS = ['title', 'subtitle', 'summary', 'content'];

@Injectable()
export class JournalService {
  // The deployed API uses one PM2 process. Multiple replicas require shared invalidation.
  private cacheGeneration = 0;

  private async invalidatePublicCache(): Promise<void> {
    this.cacheGeneration++;
    await this.cache.delPattern('cms:journal:*');
  }

  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
    private readonly cache: CacheService,
  ) {}

  private applyLocaleToEntry(entry: JournalEntry, locale?: string): JournalEntry {
    return applyLocale(entry, locale, I18N_FIELDS);
  }

  async findAll(category?: JournalCategory, locale?: string): Promise<JournalEntry[]> {
    if (category !== undefined && !Object.values(JournalCategory).includes(category)) {
      throw new BadRequestException('올바른 저널 카테고리를 선택해주세요.');
    }
    const key = `cms:journal:list:${locale || 'ko'}:${category || 'all'}`;
    const generation = this.cacheGeneration;
    const cached = await this.cache.get<JournalEntry[]>(key);
    if (cached) return structuredClone(cached);
    const where = { isPublished: true };
    if (category) {
      Object.assign(where, { category });
    }
    const entries = await this.journalRepository.find({
      where,
      order: { date: 'DESC' },
    });
    const result = entries.map((e) => this.applyLocaleToEntry(e, locale));
    if (generation === this.cacheGeneration) await this.cache.set(key, structuredClone(result), 60);
    return result;
  }

  async findAllAdmin(): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      order: { date: 'DESC' },
    });
  }

  async findBySlug(slug: string, locale?: string): Promise<JournalEntry> {
    const key = `cms:journal:detail:${locale || 'ko'}:${slug}`;
    const generation = this.cacheGeneration;
    const cached = await this.cache.get<JournalEntry>(key);
    if (cached) return structuredClone(cached);
    const entry = await findOrThrow(this.journalRepository, { slug, isPublished: true }, '저널을 찾을 수 없습니다.');
    const result = this.applyLocaleToEntry(entry, locale);
    if (generation === this.cacheGeneration) await this.cache.set(key, structuredClone(result), 60);
    return result;
  }

  async findById(id: number): Promise<JournalEntry> {
    return findOrThrow(this.journalRepository, { id }, '저널을 찾을 수 없습니다.');
  }

  async create(dto: CreateJournalDto): Promise<JournalEntry> {
    const entry = this.journalRepository.create(dto as JournalEntry);
    const saved = await this.journalRepository.save(entry);
    await this.invalidatePublicCache();
    return saved;
  }

  async update(id: number, dto: UpdateJournalDto): Promise<JournalEntry> {
    const entry = await this.findById(id);
    Object.assign(entry, dto);
    const saved = await this.journalRepository.save(entry);
    await this.invalidatePublicCache();
    return saved;
  }

  async delete(id: number): Promise<void> {
    const entry = await this.findById(id);
    await this.journalRepository.remove(entry);
    await this.invalidatePublicCache();
  }
}
