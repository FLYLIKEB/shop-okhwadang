import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
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

  async findAll(query: FaqQueryDto): Promise<Faq[]> {
    const where: Partial<Faq> = { isPublished: true };
    if (query.category) {
      where.category = query.category;
    }
    return this.faqRepo.find({
      where,
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
    const faq = await this.faqRepo.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException('FAQ를 찾을 수 없습니다.');
    }
    Object.assign(faq, dto);
    return this.faqRepo.save(faq);
  }

  async remove(id: number): Promise<void> {
    const faq = await this.faqRepo.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException('FAQ를 찾을 수 없습니다.');
    }
    await this.faqRepo.remove(faq);
    this.logger.log(`FAQ deleted: id=${id}`);
  }
}
