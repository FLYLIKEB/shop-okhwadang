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
import { findOrThrow } from '../../common/utils/repository.util';

const MAX_DEPTH = 3;

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationItem)
    private readonly navigationRepository: Repository<NavigationItem>,
  ) {}

  async findActiveByGroup(group: 'gnb' | 'sidebar' | 'footer'): Promise<NavigationItem[]> {
    const items = await this.navigationRepository.find({
      where: { group, is_active: true },
      order: { sort_order: 'ASC' },
    });
    return this.buildTree(items);
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
    return this.navigationRepository.save(item);
  }

  async update(id: number, dto: UpdateNavigationItemDto): Promise<NavigationItem> {
    const item = await findOrThrow(this.navigationRepository, { id } as any, '존재하지 않는 네비게이션 항목입니다.');

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
    return this.navigationRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await findOrThrow(this.navigationRepository, { id } as any, '존재하지 않는 네비게이션 항목입니다.');
    await this.navigationRepository.remove(item);
  }

  async reorder(dto: ReorderNavigationDto): Promise<void> {
    for (const orderItem of dto.orders) {
      await this.navigationRepository.update(
        { id: orderItem.id },
        { sort_order: orderItem.sort_order },
      );
    }
  }

  private buildTree(items: NavigationItem[]): NavigationItem[] {
    const map = new Map<number, NavigationItem>();
    const roots: NavigationItem[] = [];

    for (const item of items) {
      map.set(Number(item.id), { ...item, children: [] });
    }

    for (const item of items) {
      const node = map.get(Number(item.id))!;
      if (item.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(Number(item.parent_id));
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    return roots;
  }

  private async validateDepth(parentId: number, currentItemId?: number): Promise<void> {
    let depth = 1;
    let currentParentId: number | null = parentId;

    while (currentParentId !== null) {
      depth++;
      if (depth > MAX_DEPTH) {
        throw new BadRequestException('메뉴는 최대 3단계까지 생성할 수 있습니다.');
      }
      const parent = await this.navigationRepository.findOne({
        where: { id: currentParentId },
      });
      if (!parent) break;
      currentParentId = parent.parent_id;
    }

    if (currentItemId !== undefined) {
      const maxChildDepth = await this.getMaxChildDepth(currentItemId);
      if (depth + maxChildDepth > MAX_DEPTH) {
        throw new BadRequestException('메뉴는 최대 3단계까지 생성할 수 있습니다.');
      }
    }
  }

  private async getMaxChildDepth(itemId: number): Promise<number> {
    const children = await this.navigationRepository.find({
      where: { parent_id: itemId },
    });
    if (children.length === 0) return 0;

    let maxDepth = 0;
    for (const child of children) {
      const childDepth = await this.getMaxChildDepth(Number(child.id));
      if (childDepth + 1 > maxDepth) {
        maxDepth = childDepth + 1;
      }
    }
    return maxDepth;
  }

  private async checkCircularReference(itemId: number, newParentId: number): Promise<void> {
    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === itemId) {
        throw new BadRequestException('순환 참조는 허용되지 않습니다.');
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent = await this.navigationRepository.findOne({
        where: { id: currentId },
      });
      if (!parent) break;
      currentId = parent.parent_id !== null ? Number(parent.parent_id) : null;
    }
  }
}
