import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection, CollectionType } from './entities/collection.entity';
import { applyLocale } from '../../common/utils/locale.util';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  private applyLocaleToCollection(entity: Collection, locale?: string): Collection {
    // ko 로케일: name 컬럼이 영문 슬러그일 수 있으므로 nameKo 우선 적용
    if (!locale || locale === 'ko') {
      return entity.nameKo ? { ...entity, name: entity.nameKo } : entity;
    }
    const localized = applyLocale(entity, locale, ['name', 'description']);
    // 비한국어 로케일: nameKo 에 남은 한국어가 그대로 노출되지 않도록 로컬라이즈된 name 으로 덮어씀
    localized.nameKo = localized.name ?? null;
    return localized;
  }

  async findAllByType(type: CollectionType, locale?: string): Promise<Collection[]> {
    const collections = await this.collectionRepository.find({
      where: { type, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return collections.map((c) => this.applyLocaleToCollection(c, locale));
  }
}
