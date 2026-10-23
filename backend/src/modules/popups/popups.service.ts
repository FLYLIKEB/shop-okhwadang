import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { findOrThrow } from '../../common/utils/repository.util';
import { CreatePopupDto, UpdatePopupDto } from './dto/create-popup.dto';
import { Popup } from './entities/popup.entity';

@Injectable()
export class PopupsService {
  constructor(@InjectRepository(Popup) private readonly repository: Repository<Popup>) {}

  findAll(): Promise<Popup[]> {
    return this.repository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  findActive(): Promise<Popup[]> {
    const now = new Date();
    return this.repository.createQueryBuilder('popup')
      .where('popup.isActive = :active', { active: true })
      .andWhere('(popup.startsAt IS NULL OR popup.startsAt <= :now)', { now })
      .andWhere('(popup.endsAt IS NULL OR popup.endsAt > :now)', { now })
      .orderBy('popup.sortOrder', 'ASC')
      .addOrderBy('popup.id', 'ASC')
      .getMany();
  }

  create(dto: CreatePopupDto): Promise<Popup> {
    const popup = this.repository.create({ linkUrl: null, sortOrder: 0, isActive: false, startsAt: null, endsAt: null });
    return this.save(popup, dto);
  }

  async update(id: number, dto: UpdatePopupDto): Promise<Popup> {
    const popup = await findOrThrow(this.repository, { id }, '팝업을 찾을 수 없습니다.');
    return this.save(popup, dto);
  }

  async remove(id: number): Promise<void> {
    const popup = await findOrThrow(this.repository, { id }, '팝업을 찾을 수 없습니다.');
    await this.repository.remove(popup);
  }

  private save(popup: Popup, dto: UpdatePopupDto): Promise<Popup> {
    const { startsAt, endsAt, ...fields } = dto;
    Object.assign(popup, fields);
    if (startsAt !== undefined) popup.startsAt = startsAt === null ? null : new Date(startsAt);
    if (endsAt !== undefined) popup.endsAt = endsAt === null ? null : new Date(endsAt);
    if (popup.startsAt && popup.endsAt && popup.startsAt >= popup.endsAt) {
      throw new BadRequestException('종료 일시는 시작 일시보다 늦어야 합니다.');
    }
    return this.repository.save(popup);
  }
}
