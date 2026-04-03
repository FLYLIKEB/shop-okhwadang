import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry, JournalCategory } from './entities/journal-entry.entity';
import { CreateJournalDto, UpdateJournalDto } from './dto/journal.dto';
import { findOrThrow } from '../../common/utils/repository.util';

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
  ) {}

  async findAll(category?: JournalCategory): Promise<JournalEntry[]> {
    const where = { isPublished: true };
    if (category) {
      Object.assign(where, { category });
    }
    return this.journalRepository.find({
      where,
      order: { date: 'DESC' },
    });
  }

  async findAllAdmin(): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      order: { date: 'DESC' },
    });
  }

  async findBySlug(slug: string): Promise<JournalEntry> {
    return findOrThrow(this.journalRepository, { slug }, '저널을 찾을 수 없습니다.');
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
