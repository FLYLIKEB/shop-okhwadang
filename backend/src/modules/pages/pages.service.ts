import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { PageBlock } from './entities/page-block.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { UpdatePageBlockDto } from './dto/update-page-block.dto';
import { ReorderBlocksDto } from './dto/reorder-blocks.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';

const SUPPORTED_BLOCK_TYPES = [
  'hero_banner',
  'product_grid',
  'product_carousel',
  'category_nav',
  'promotion_banner',
  'text_content',
  'split_content',
  'brand_story',
];

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(PageBlock)
    private readonly blockRepository: Repository<PageBlock>,
  ) {}

  private applyLocaleToPage(entity: Page, locale?: string): Page {
    return applyLocale(entity, locale, ['title']);
  }

  async findAllPublished(locale?: string): Promise<Page[]> {
    const pages = await this.pageRepository.find({
      where: { is_published: true },
      order: { created_at: 'DESC' },
    });
    return pages.map((p) => this.applyLocaleToPage(p, locale));
  }

  async findBySlug(slug: string, locale?: string): Promise<Page> {
    const page = await findOrThrow(this.pageRepository, { slug, is_published: true }, '존재하지 않는 페이지입니다.', ['blocks']);
    page.blocks = page.blocks
      .filter((b) => b.is_visible)
      .sort((a, b) => a.sort_order - b.sort_order);
    return this.applyLocaleToPage(page, locale);
  }

  async findAllAdmin(): Promise<Page[]> {
    return this.pageRepository.find({
      relations: ['blocks'],
      order: { created_at: 'DESC' },
    });
  }

  async create(dto: CreatePageDto): Promise<Page> {
    const existing = await this.pageRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 슬러그입니다.');
    }
    const page = this.pageRepository.create(dto);
    return this.pageRepository.save(page);
  }

  async update(id: number, dto: UpdatePageDto): Promise<Page> {
    const page = await findOrThrow(this.pageRepository, { id }, '존재하지 않는 페이지입니다.');
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.pageRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('이미 사용 중인 슬러그입니다.');
      }
    }
    Object.assign(page, dto);
    return this.pageRepository.save(page);
  }

  async remove(id: number): Promise<void> {
    const page = await findOrThrow(this.pageRepository, { id }, '존재하지 않는 페이지입니다.');
    if (page.is_published) {
      throw new BadRequestException(
        '공개 중인 페이지는 삭제할 수 없습니다. 먼저 비공개 처리하세요.',
      );
    }
    await this.pageRepository.remove(page);
  }

  async createBlock(
    pageId: number,
    dto: CreatePageBlockDto,
  ): Promise<PageBlock> {
    await findOrThrow(this.pageRepository, { id: pageId }, '존재하지 않는 페이지입니다.');
    if (!SUPPORTED_BLOCK_TYPES.includes(dto.type)) {
      throw new BadRequestException('지원하지 않는 블록 타입입니다.');
    }
    const block = this.blockRepository.create({
      ...dto,
      page_id: pageId,
    });
    return this.blockRepository.save(block);
  }

  async updateBlock(
    pageId: number,
    blockId: number,
    dto: UpdatePageBlockDto,
  ): Promise<PageBlock> {
    const block = await findOrThrow(this.blockRepository, { id: blockId, page_id: pageId }, '존재하지 않는 블록입니다.');
    if (dto.type && !SUPPORTED_BLOCK_TYPES.includes(dto.type)) {
      throw new BadRequestException('지원하지 않는 블록 타입입니다.');
    }
    Object.assign(block, dto);
    return this.blockRepository.save(block);
  }

  async removeBlock(pageId: number, blockId: number): Promise<void> {
    const block = await findOrThrow(this.blockRepository, { id: blockId, page_id: pageId }, '존재하지 않는 블록입니다.');
    await this.blockRepository.remove(block);
  }

  async reorderBlocks(
    pageId: number,
    dto: ReorderBlocksDto,
  ): Promise<void> {
    await findOrThrow(this.pageRepository, { id: pageId }, '존재하지 않는 페이지입니다.');
    await Promise.all(
      dto.orders.map((item) =>
        this.blockRepository.update(
          { id: item.id, page_id: pageId },
          { sort_order: item.sort_order },
        ),
      ),
    );
  }
}
