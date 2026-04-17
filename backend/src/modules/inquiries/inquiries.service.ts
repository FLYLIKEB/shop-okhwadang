import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from './entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async findAllByUser(userId: number): Promise<Inquiry[]> {
    return this.inquiryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Inquiry> {
    const inquiry = await findOrThrow(this.inquiryRepo, { id }, '문의를 찾을 수 없습니다.');
    assertOwnership(inquiry.userId, userId, '권한이 없습니다.');
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
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async answerInquiry(id: number, dto: AnswerInquiryDto): Promise<Inquiry> {
    const inquiry = await findOrThrow(this.inquiryRepo, { id }, '문의를 찾을 수 없습니다.');
    inquiry.answer = dto.answer;
    inquiry.status = InquiryStatus.ANSWERED;
    inquiry.answeredAt = new Date();
    const saved = await this.inquiryRepo.save(inquiry);
    this.logger.log(`Inquiry answered: id=${id}`);

    void this.notifyInquiryAnswered(saved.userId, saved.title, saved.answer ?? '');

    return saved;
  }

  private async notifyInquiryAnswered(
    userId: number,
    inquiryTitle: string,
    answer: string,
  ): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user?.email) return;
      await this.notificationService.sendInquiryAnswered(user.email, {
        recipientName: user.name,
        inquiryTitle,
        answer,
      });
    } catch (err) {
      this.logger.warn(`Inquiry answered email failed: ${String(err)}`);
    }
  }
}
