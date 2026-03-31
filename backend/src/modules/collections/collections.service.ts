import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection, CollectionType } from './entities/collection.entity';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  async findAllByType(type: CollectionType): Promise<Collection[]> {
    return this.collectionRepository.find({
      where: { type, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findAll(): Promise<Collection[]> {
    return this.collectionRepository.find({
      order: { type: 'ASC', sortOrder: 'ASC' },
    });
  }

  async findById(id: number): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException('컬렉션을 찾을 수 없습니다.');
    }
    return collection;
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
    for (const item of items) {
      await this.collectionRepository.update({ id: item.id }, { sortOrder: item.sortOrder });
    }
  }
}
