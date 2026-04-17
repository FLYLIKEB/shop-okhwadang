import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NavigationItem } from './entities/navigation-item.entity';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderNavigationDto } from './dto/reorder-navigation.dto';
import { CacheService } from '../cache/cache.service';
import { findOrThrow } from '../../common/utils/repository.util';
import { reorderEntities } from '../../common/utils/reorder.util';
import { buildTree } from '../../common/utils/tree.util';
import { applyLocale } from '../../common/utils/locale.util';

const MAX_DEPTH = 3;
const CACHE_TTL = 300;

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationItem)
    private readonly navigationRepository: Repository<NavigationItem>,
    private readonly cacheService: CacheService,
  ) {}

  async findActiveByGroup(group: 'gnb' | 'sidebar' | 'footer', locale?: string): Promise<NavigationItem[]> {
    const cacheKey = `navigation:active:${group}:${locale ?? 'ko'}`;
    const cached = await this.cacheService.get<NavigationItem[]>(cacheKey);
    if (cached) return cached;

    const items = await this.navigationRepository.find({
      where: { group, is_active: true },
      order: { sort_order: 'ASC' },
    });
    const tree = this.buildTree(items);
    const result = this.applyLocaleToTree(tree, locale);
    await this.cacheService.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  private applyLocaleToTree(items: NavigationItem[], locale?: string): NavigationItem[] {
    if (!locale || locale === 'ko') return items;
    return items.map((item) => {
      const localized = { ...applyLocale(item, locale, ['label']) };
      if (localized.children && localized.children.length) {
        localized.children = this.applyLocaleToTree(localized.children, locale);
      }
      return localized;
    });
  }

  async findAllByGroup(group: 'gnb' | 'sidebar' | 'footer'): Promise<NavigationItem[]> {
    const items = await this.navigationRepository.find({
      where: { group },
      order: { sort_order: 'ASC' },
    });
    return this.buildTree(items);
  }

  async create(dto: CreateNavigationItemDto): Promise<NavigationItem> {
    if (dto.parent_id !== undefined && dto.parent_id !== null) {
      await this.validateDepth(dto.parent_id);
    }
    const item = this.navigationRepository.create(dto);
    const saved = await this.navigationRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: UpdateNavigationItemDto): Promise<NavigationItem> {
    const item = await findOrThrow(this.navigationRepository, { id }, '존재하지 않는 네비게이션 항목입니다.');

    if (dto.parent_id !== undefined) {
      if (dto.parent_id !== null) {
        if (dto.parent_id === id) {
          throw new BadRequestException('순환 참조는 허용되지 않습니다.');
        }
        await this.checkCircularReference(id, dto.parent_id);
        await this.validateDepth(dto.parent_id, id);
      }
    }

    Object.assign(item, dto);
    const saved = await this.navigationRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const item = await findOrThrow(this.navigationRepository, { id }, '존재하지 않는 네비게이션 항목입니다.');
    await this.navigationRepository.remove(item);
    await this.invalidateCache();
  }

  async reorder(dto: ReorderNavigationDto): Promise<void> {
    const items = dto.orders.map((o) => ({ id: o.id, sortOrder: o.sort_order }));
    await reorderEntities(this.navigationRepository, items, 'sort_order');
    await this.invalidateCache();
  }

  private buildTree(items: NavigationItem[]): NavigationItem[] {
    return buildTree(items, 'id', 'parent_id');
  }

  private async loadAllItemsForGroup(group: 'gnb' | 'sidebar' | 'footer'): Promise<Map<number, NavigationItem>> {
    const items = await this.navigationRepository.find({ where: { group } });
    const map = new Map<number, NavigationItem>();
    for (const item of items) {
      map.set(Number(item.id), item);
    }
    return map;
  }

  private async validateDepth(parentId: number, currentItemId?: number): Promise<void> {
    const allItems = await this.loadAllItemsForGroup('gnb');
    let depth = 1;
    let currentParentId: number | null = parentId;

    while (currentParentId !== null) {
      depth++;
      if (depth > MAX_DEPTH) {
        throw new BadRequestException('메뉴는 최대 3단계까지 생성할 수 있습니다.');
      }
      const parent = allItems.get(Number(currentParentId));
      if (!parent) break;
      currentParentId = parent.parent_id;
    }

    if (currentItemId !== undefined) {
      const maxChildDepth = await this.getMaxChildDepth(currentItemId, allItems);
      if (depth + maxChildDepth > MAX_DEPTH) {
        throw new BadRequestException('메뉴는 최대 3단계까지 생성할 수 있습니다.');
      }
    }
  }

  private async getMaxChildDepth(
    itemId: number,
    allItems: Map<number, NavigationItem>,
  ): Promise<number> {
    const children = [...allItems.values()].filter((item) => item.parent_id === itemId);
    if (children.length === 0) return 0;

    let maxDepth = 0;
    for (const child of children) {
      const childDepth = await this.getMaxChildDepth(Number(child.id), allItems);
      if (childDepth + 1 > maxDepth) {
        maxDepth = childDepth + 1;
      }
    }
    return maxDepth;
  }

  private async checkCircularReference(itemId: number, newParentId: number): Promise<void> {
    const allItems = await this.loadAllItemsForGroup('gnb');
    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === itemId) {
        throw new BadRequestException('순환 참조는 허용되지 않습니다.');
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = allItems.get(Number(currentId));
      if (!parent) break;
      currentId = parent.parent_id !== null ? Number(parent.parent_id) : null;
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheService.delPattern('navigation:active:*');
  }
}