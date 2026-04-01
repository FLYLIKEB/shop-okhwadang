import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { findOrThrow } from '../../common/utils/repository.util';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
  ) {}

  async findAllByUser(userId: number): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Inquiry> {
    const inquiry = await findOrThrow(this.inquiryRepo, { id }, '문의를 찾을 수 없습니다.');
    if (Number(inquiry.userId) !== Number(userId)) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return inquiry;
  }

  async create(userId: number, dto: CreateInquiryDto): Promise<Inquiry> {
    const inquiry = this.inquiryRepo.create({
      userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
    });
    const saved = await this.inquiryRepo.save(inquiry);
    this.logger.log(`Inquiry created: id=${saved.id}, userId=${userId}`);
    return saved;
  }

  async findAllForAdmin(): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async answerInquiry(id: number, dto: AnswerInquiryDto): Promise<Inquiry> {
    const inquiry = await findOrThrow(this.inquiryRepo, { id }, '문의를 찾을 수 없습니다.');
    inquiry.answer = dto.answer;
    inquiry.status = 'answered';
    inquiry.answeredAt = new Date();
    const saved = await this.inquiryRepo.save(inquiry);
    this.logger.log(`Inquiry answered: id=${id}`);
    return saved;
  }
}
