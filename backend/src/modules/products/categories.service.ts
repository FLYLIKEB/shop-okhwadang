import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { buildTree } from '../../common/utils/tree.util';

export interface CategoryTree extends Omit<Category, 'children' | 'products'> {
  children: CategoryTree[];
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findTree(): Promise<CategoryTree[]> {
    const all = await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return this.buildTree(all);
  }

  async findAll(): Promise<CategoryTree[]> {
    const all = await this.categoryRepository.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return this.buildTree(all);
  }

  private buildTree(categories: Category[]): CategoryTree[] {
    return buildTree(categories, 'id', 'parentId') as CategoryTree[];
  }

  private async getDepth(parentId: number | null | undefined): Promise<number> {
    if (!parentId) return 1;

    let depth = 1;
    let currentId: number | null = parentId;

    while (currentId !== null) {
      depth++;
      const parent = await this.categoryRepository.findOne({ where: { id: currentId } });
      if (!parent) break;
      currentId = parent.parentId;
    }

    return depth;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const depth = await this.getDepth(dto.parentId);
    if (depth > 3) {
      throw new BadRequestException('카테고리는 최대 3단계까지만 허용됩니다.');
    }

    if (dto.parentId) {
      await findOrThrow(this.categoryRepository, { id: dto.parentId }, `부모 카테고리(id: ${dto.parentId})를 찾을 수 없습니다.`);
    }

    const existing = await this.categoryRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`slug '${dto.slug}'는 이미 사용 중입니다.`);
    }

    const category = this.categoryRepository.create({
      name: dto.name,
      slug: dto.slug,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      imageUrl: dto.imageUrl ?? null,
    });

    return this.categoryRepository.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const category = await findOrThrow(this.categoryRepository, { id }, `카테고리(id: ${id})를 찾을 수 없습니다.`);

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('자기 자신을 부모로 설정할 수 없습니다.');
      }

      if (dto.parentId) {
        await findOrThrow(this.categoryRepository, { id: dto.parentId }, `부모 카테고리(id: ${dto.parentId})를 찾을 수 없습니다.`);

        const depth = await this.getDepth(dto.parentId);
        if (depth >= 3) {
          throw new BadRequestException('카테고리는 최대 3단계까지만 허용됩니다.');
        }
      }
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`slug '${dto.slug}'는 이미 사용 중입니다.`);
      }
    }

    Object.assign(category, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
    });

    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await findOrThrow(this.categoryRepository, { id }, `카테고리(id: ${id})를 찾을 수 없습니다.`);

    const childCount = await this.categoryRepository.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new BadRequestException('하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.');
    }

    const productCount = await this.categoryRepository.query(
      'SELECT COUNT(*) as cnt FROM products WHERE category_id = ?',
      [id],
    ) as Array<{ cnt: string }>;
    if (Number(productCount[0].cnt) > 0) {
      throw new BadRequestException('연관된 상품이 있는 카테고리는 삭제할 수 없습니다.');
    }

    await this.categoryRepository.remove(category);
    this.logger.log(`Category(id: ${id}) deleted`);
  }

  async reorder(dto: ReorderCategoriesDto): Promise<void> {
    await Promise.all(
      dto.orders.map(({ id, sortOrder }) =>
        this.categoryRepository.update(id, { sortOrder }),
      ),
    );
  }
}
