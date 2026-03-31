import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './entities/notice.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NoticeQueryDto } from './dto/notice-query.dto';

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);

  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepo: Repository<Notice>,
  ) {}

  private applyLocale(notice: Notice, locale?: string): Notice {
    if (!locale || locale === 'ko') return notice;
    const localeMap: Record<string, 'En' | 'Ja' | 'Zh'> = { en: 'En', ja: 'Ja', zh: 'Zh' };
    const suffix = localeMap[locale];
    if (!suffix) return notice;

    const titleKey = `title${suffix}` as keyof Notice;
    const contentKey = `content${suffix}` as keyof Notice;

    return {
      ...notice,
      title: (notice[titleKey] as string | null) ?? notice.title,
      content: (notice[contentKey] as string | null) ?? notice.content,
    };
  }

  async findAll(query: NoticeQueryDto = {}): Promise<Notice[]> {
    const notices = await this.noticeRepo.find({
      where: { isPublished: true },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
    return notices.map((n) => this.applyLocale(n, query.locale));
  }

  async findOne(id: number, locale?: string): Promise<Notice> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    await this.noticeRepo.update(id, { viewCount: () => 'view_count + 1' });
    notice.viewCount += 1;
    return this.applyLocale(notice, locale);
  }

  async create(dto: CreateNoticeDto): Promise<Notice> {
    const notice = this.noticeRepo.create({
      title: dto.title,
      content: dto.content,
      isPinned: dto.isPinned ?? false,
      isPublished: dto.isPublished ?? true,
    });
    const saved = await this.noticeRepo.save(notice);
    this.logger.log(`Notice created: id=${saved.id}`);
    return saved;
  }

  async update(id: number, dto: UpdateNoticeDto): Promise<Notice> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    Object.assign(notice, dto);
    return this.noticeRepo.save(notice);
  }

  async remove(id: number): Promise<void> {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    await this.noticeRepo.remove(notice);
    this.logger.log(`Notice deleted: id=${id}`);
  }
}
