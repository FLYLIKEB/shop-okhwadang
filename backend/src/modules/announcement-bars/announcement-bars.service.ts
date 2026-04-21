import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { reorderEntities } from '../../common/utils/reorder.util';
import { AnnouncementBar } from './entities/announcement-bar.entity';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';
import { ReorderAnnouncementBarsDto } from './dto/reorder-announcement-bars.dto';
import { findOrThrow } from '../../common/utils/repository.util';

@Injectable()
export class AnnouncementBarsService {
  constructor(
    @InjectRepository(AnnouncementBar)
    private readonly announcementBarRepository: Repository<AnnouncementBar>,
  ) {}

  async findActive(locale?: string): Promise<AnnouncementBar[]> {
    const items = await this.announcementBarRepository.find({
      where: { is_active: true },
      order: { sort_order: 'ASC' },
    });

    if (locale !== 'en') {
      return items;
    }

    return items.map((item) => ({
      ...item,
      message: item.message_en && item.message_en.trim().length > 0 ? item.message_en : item.message,
    }));
  }

  async findAll(): Promise<AnnouncementBar[]> {
    return this.announcementBarRepository.find({
      order: { sort_order: 'ASC' },
    });
  }

  async create(dto: CreateAnnouncementBarDto): Promise<AnnouncementBar> {
    const item = this.announcementBarRepository.create({
      message: dto.message,
      message_en: dto.message_en ?? null,
      href: dto.href ?? null,
      sort_order: dto.sort_order ?? 0,
      is_active: dto.is_active ?? true,
    });

    return this.announcementBarRepository.save(item);
  }

  async update(id: number, dto: UpdateAnnouncementBarDto): Promise<AnnouncementBar> {
    const item = await findOrThrow(
      this.announcementBarRepository,
      { id },
      '존재하지 않는 안내 바입니다.'
    );

    Object.assign(item, {
      ...dto,
      message_en: dto.message_en === undefined ? item.message_en : (dto.message_en ?? null),
      href: dto.href === undefined ? item.href : (dto.href ?? null),
    });

    return this.announcementBarRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await findOrThrow(
      this.announcementBarRepository,
      { id },
      '존재하지 않는 안내 바입니다.'
    );

    await this.announcementBarRepository.remove(item);
  }

  async reorder(dto: ReorderAnnouncementBarsDto): Promise<void> {
    const items = dto.orders.map((o) => ({ id: o.id, sortOrder: o.sort_order }));
    await reorderEntities(this.announcementBarRepository, items, 'sort_order');
  }
}
