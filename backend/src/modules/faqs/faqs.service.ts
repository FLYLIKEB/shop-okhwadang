import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';

@Injectable()
export class FaqsService {
  private readonly logger = new Logger(FaqsService.name);

  constructor(
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
  ) {}

  private applyLocale(faq: Faq, locale?: string): Faq {
    return applyLocale(faq, locale, ['question', 'answer']);
  }

  async findAll(query: FaqQueryDto): Promise<Faq[]> {
    const where: FindOptionsWhere<Faq> = { isPublished: true };
    if (query.category) {
      where.category = query.category;
    }
    const faqs = await this.faqRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return faqs.map((f) => this.applyLocale(f, query.locale));
  }

  async findAllForAdmin(): Promise<Faq[]> {
    return this.faqRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(dto: CreateFaqDto): Promise<Faq> {
    const faq = this.faqRepo.create({
      category: dto.category,
      question: dto.question,
      answer: dto.answer,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
    });
    const saved = await this.faqRepo.save(faq);
    this.logger.log(`FAQ created: id=${saved.id}`);
    return saved;
  }

  async update(id: number, dto: UpdateFaqDto): Promise<Faq> {
    const faq = await findOrThrow(this.faqRepo, { id }, 'FAQ를 찾을 수 없습니다.');
    Object.assign(faq, dto);
    return this.faqRepo.save(faq);
  }

  async remove(id: number): Promise<void> {
    const faq = await findOrThrow(this.faqRepo, { id }, 'FAQ를 찾을 수 없습니다.');
    await this.faqRepo.remove(faq);
    this.logger.log(`FAQ deleted: id=${id}`);
  }
}
