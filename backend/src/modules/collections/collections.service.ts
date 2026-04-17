import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection, CollectionType } from './entities/collection.entity';
import { findOrThrow } from '../../common/utils/repository.util';
import { reorderEntities } from '../../common/utils/reorder.util';
import { applyLocale } from '../../common/utils/locale.util';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  private applyLocaleToCollection(entity: Collection, locale?: string): Collection {
    return applyLocale(entity, locale, ['name', 'description']);
  }

  async findAllByType(type: CollectionType, locale?: string): Promise<Collection[]> {
    const collections = await this.collectionRepository.find({
      where: { type, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return collections.map((c) => this.applyLocaleToCollection(c, locale));
  }

  async findAll(locale?: string): Promise<Collection[]> {
    const collections = await this.collectionRepository.find({
      order: { type: 'ASC', sortOrder: 'ASC' },
    });
    return collections.map((c) => this.applyLocaleToCollection(c, locale));
  }

  async findById(id: number, locale?: string): Promise<Collection> {
    const collection = await findOrThrow(this.collectionRepository, { id }, '컬렉션을 찾을 수 없습니다.');
    return this.applyLocaleToCollection(collection, locale);
  }

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const collection = this.collectionRepository.create(dto);
    return this.collectionRepository.save(collection);
  }

  async update(id: number, dto: UpdateCollectionDto): Promise<Collection> {
    const collection = await this.findById(id);
    Object.assign(collection, dto);
    return this.collectionRepository.save(collection);
  }

  async remove(id: number): Promise<void> {
    const collection = await this.findById(id);
    await this.collectionRepository.remove(collection);
  }

  async reorder(items: { id: number; sortOrder: number }[]): Promise<void> {
    await reorderEntities(this.collectionRepository, items);
  }
}
