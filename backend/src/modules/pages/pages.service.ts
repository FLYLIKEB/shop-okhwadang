import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Page } from './entities/page.entity';
import { PageBlock } from './entities/page-block.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreatePageBlockDto } from './dto/create-page-block.dto';
import { UpdatePageBlockDto } from './dto/update-page-block.dto';
import { ReorderBlocksDto } from './dto/reorder-blocks.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale, applyLocaleToContent } from '../../common/utils/locale.util';
import { REQUIRED_CHECKOUT_POLICY_SLUGS } from '../../common/constants/policy.constants';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { SavePageDraftDto } from './dto/save-page-draft.dto';

const SUPPORTED_BLOCK_TYPES = [
  'hero_banner',
  'product_grid',
  'product_carousel',
  'category_nav',
  'promotion_banner',
  'text_content',
  'split_content',
  'brand_story',
  'journal_preview',
  'color_card_list',
  'timeline_list',
  'person_card_list',
  'image_card_grid',
];

const GENERIC_ITEM_BLOCK_TYPES = new Set([
  'color_card_list',
  'timeline_list',
  'person_card_list',
  'image_card_grid',
]);

export interface CurrentPolicyMetadata {
  slug: string;
  title: string;
  titleEn: string | null;
  version: string | null;
  effectiveDate: string | null;
}

function validateGenericBlockContent(type: string, content: Record<string, unknown>): void {
  if (!GENERIC_ITEM_BLOCK_TYPES.has(type)) return;

  if (!Array.isArray(content.items)) {
    throw new BadRequestException('블록 콘텐츠 items는 배열이어야 합니다.');
  }

  if (type === 'color_card_list') {
    const layout = content.layout;
    if (layout !== 'alternating' && layout !== 'grid-3') {
      throw new BadRequestException('색상 카드 리스트 layout은 alternating 또는 grid-3이어야 합니다.');
    }
  }
}


@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(PageBlock)
    private readonly blockRepository: Repository<PageBlock>,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async saveDraft(id: number, actorId: number, key: string | undefined, dto: SavePageDraftDto): Promise<Page> {
    const { result } = await this.idempotencyService.execute(
      `page:${id}:actor:${actorId}`, 'cms-draft-save', key, dto, async (manager) => {
        const pages = manager.getRepository(Page);
        const blocks = manager.getRepository(PageBlock);
        const page = await pages.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!page) throw new NotFoundException('존재하지 않는 페이지입니다.');
        const existing = await blocks.createQueryBuilder('block')
          .where('block.page_id = :id', { id }).setLock('pessimistic_write').getMany();
        const existingById = new Map(existing.map((block) => [Number(block.id), block]));
        const seen = new Set<number>();
        for (const block of dto.blocks) {
          if (block.id === 0 || seen.has(block.id)) throw new BadRequestException('블록 ID가 중복되거나 올바르지 않습니다.');
          seen.add(block.id);
          if (block.id > 0 && !existingById.has(block.id)) throw new BadRequestException('이 페이지에 속하지 않는 블록입니다.');
          if (!SUPPORTED_BLOCK_TYPES.includes(block.type)) throw new BadRequestException('지원하지 않는 블록 타입입니다.');
          validateGenericBlockContent(block.type, block.content);
        }
        if (dto.slug !== page.slug) {
          const duplicate = await pages.findOne({ where: { slug: dto.slug } });
          if (duplicate) throw new ConflictException('이미 사용 중인 슬러그입니다.');
        }
        const removed = existing.filter((block) => !seen.has(Number(block.id)));
        if (removed.length) await blocks.remove(removed);
        for (const block of dto.blocks) {
          const values = { type: block.type, content: block.content, sort_order: block.sort_order, is_visible: block.is_visible };
          if (block.id > 0) await blocks.update({ id: block.id, page_id: id }, values as QueryDeepPartialEntity<PageBlock>);
          else await blocks.save(blocks.create({ page_id: id, ...values }));
        }
        await pages.update(id, {
          title: dto.title, slug: dto.slug,
          ...(dto.is_published === undefined ? {} : { is_published: dto.is_published }),
        });
        const savedPage = await pages.findOneOrFail({ where: { id }, lock: { mode: 'pessimistic_write' } });
        savedPage.blocks = await blocks.createQueryBuilder('block')
          .where('block.page_id = :id', { id }).setLock('pessimistic_write').getMany();
        return this.sortBlocks(savedPage);
      },
    );
    return result;
  }

  private applyLocaleToPage(entity: Page, locale?: string): Page {
    const localized = applyLocale(entity, locale, ['title']);
    if (localized.blocks) {
      localized.blocks = localized.blocks.map((block) => ({
        ...block,
        content: applyLocaleToContent(block.content, locale),
      }));
    }
    return localized;
  }

  async findAllPublished(locale?: string): Promise<Page[]> {
    const pages = await this.pageRepository.find({
      where: { is_published: true },
      order: { created_at: 'DESC' },
    });
    return pages.map((p) => this.applyLocaleToPage(p, locale));
  }

  async findCurrentPolicies(locale?: string): Promise<CurrentPolicyMetadata[]> {
    const pages = await this.pageRepository.find({
      where: { is_published: true, isCurrentPolicy: true, slug: In([...REQUIRED_CHECKOUT_POLICY_SLUGS]) },
      order: { slug: 'ASC' },
    });

    if (pages.length !== REQUIRED_CHECKOUT_POLICY_SLUGS.length) {
      throw new BadRequestException('체크아웃 필수 정책을 불러올 수 없습니다.');
    }

    return pages.map((page) => {
      const localized = applyLocale(page, locale, ['title']);
      return {
        slug: page.slug,
        title: localized.title,
        titleEn: page.titleEn,
        version: page.policyVersion,
        effectiveDate: page.policyEffectiveDate,
      };
    });
  }

  async findBySlug(slug: string, locale?: string): Promise<Page> {
    const page = await findOrThrow(this.pageRepository, { slug, is_published: true }, '존재하지 않는 페이지입니다.', ['blocks']);
    page.blocks = page.blocks
      .filter((b) => b.is_visible)
      .sort((a, b) => a.sort_order - b.sort_order);
    return this.applyLocaleToPage(page, locale);
  }

  async findAllAdmin(): Promise<Page[]> {
    const pages = await this.pageRepository.find({
      relations: ['blocks'],
      order: { created_at: 'DESC' },
    });
    return pages.map((page) => this.sortBlocks(page));
  }

  async findOneAdmin(id: number): Promise<Page> {
    const page = await findOrThrow(
      this.pageRepository,
      { id },
      '존재하지 않는 페이지입니다.',
      ['blocks'],
    );
    return this.sortBlocks(page);
  }

  private sortBlocks(page: Page): Page {
    if (page.blocks) {
      page.blocks = [...page.blocks].sort((a, b) => a.sort_order - b.sort_order);
    }
    return page;
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
    validateGenericBlockContent(dto.type, dto.content);
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
    const nextType = dto.type ?? block.type;
    if (dto.content) {
      validateGenericBlockContent(nextType, dto.content);
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
