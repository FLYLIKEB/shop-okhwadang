import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry, InquiryStatus } from './entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { AdminInquiryQueryDto } from './dto/admin-inquiry-query.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { NotificationService } from '../notification/notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { PaginatedResult, paginate } from '../../common/utils/pagination.util';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
    private readonly notificationService: NotificationService,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
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

    if (inquiry.answeredAt && !inquiry.customerReadAt) {
      inquiry.customerReadAt = new Date();
      await this.inquiryRepo.save(inquiry);
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

  async findAllForAdmin(query: AdminInquiryQueryDto = {}): Promise<PaginatedResult<Inquiry>> {
    const qb = this.inquiryRepo
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.user', 'user')
      .orderBy('inquiry.createdAt', 'DESC');

    if (query.unread) {
      qb.andWhere('inquiry.answeredAt IS NOT NULL')
        .andWhere('inquiry.customerReadAt IS NULL');
    }

    return paginate(qb, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  async answerInquiry(id: number, dto: AnswerInquiryDto): Promise<Inquiry> {
    const inquiry = await findOrThrow(this.inquiryRepo, { id }, '문의를 찾을 수 없습니다.');
    const isFirstAnswer = !inquiry.answeredAt;

    inquiry.answer = dto.answer;
    inquiry.status = InquiryStatus.ANSWERED;
    inquiry.answeredAt = new Date();
    inquiry.customerReadAt = null;  // 재답변 시 고객이 다시 읽도록
    const saved = await this.inquiryRepo.save(inquiry);
    this.logger.log(`Inquiry answered: id=${id}`);

    if (isFirstAnswer) {
      void this.notifyInquiryAnswered(id, saved.userId, saved.title, saved.answer ?? '');
    }

    return saved;
  }

  private async notifyInquiryAnswered(
    inquiryId: number,
    userId: number,
    inquiryTitle: string,
    answer: string,
  ): Promise<void> {
    await this.notificationDispatchHelper.dispatch({
      event: 'inquiry.answered',
      userId,
      resourceId: inquiryId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) =>
        this.notificationService.sendInquiryAnswered(recipient.email, {
          recipientName: recipient.name,
          inquiryTitle,
          answer,
        }),
    });
  }
}
