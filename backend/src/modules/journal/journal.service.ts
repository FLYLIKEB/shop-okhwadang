import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry, JournalCategory } from './entities/journal-entry.entity';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';

const I18N_FIELDS = ['title', 'subtitle', 'summary', 'content'];

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
  ) {}

  private applyLocaleToEntry(entry: JournalEntry, locale?: string): JournalEntry {
    return applyLocale(entry, locale, I18N_FIELDS);
  }

  async findAll(category?: JournalCategory, locale?: string): Promise<JournalEntry[]> {
    const where = { isPublished: true };
    if (category) {
      Object.assign(where, { category });
    }
    const entries = await this.journalRepository.find({
      where,
      order: { date: 'DESC' },
    });
    return entries.map((e) => this.applyLocaleToEntry(e, locale));
  }

  async findAllAdmin(): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      order: { date: 'DESC' },
    });
  }

  async findBySlug(slug: string, locale?: string): Promise<JournalEntry> {
    const entry = await findOrThrow(this.journalRepository, { slug }, '저널을 찾을 수 없습니다.');
    return this.applyLocaleToEntry(entry, locale);
  }

  async findById(id: number): Promise<JournalEntry> {
    return findOrThrow(this.journalRepository, { id }, '저널을 찾을 수 없습니다.');
  }

  async create(dto: CreateJournalDto): Promise<JournalEntry> {
    const entry = this.journalRepository.create(dto as JournalEntry);
    return this.journalRepository.save(entry);
  }

  async update(id: number, dto: UpdateJournalDto): Promise<JournalEntry> {
    const entry = await this.findById(id);
    Object.assign(entry, dto);
    return this.journalRepository.save(entry);
  }

  async delete(id: number): Promise<void> {
    const entry = await this.findById(id);
    await this.journalRepository.remove(entry);
  }
}
