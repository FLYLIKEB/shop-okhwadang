/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Page } from '../../../modules/pages/entities/page.entity';
import { PageBlock } from '../../../modules/pages/entities/page-block.entity';
import { pageBlocks } from '../data/seed-data';

export class PageBlockSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const pageRepo = this.dataSource.getRepository(Page);
    const blockRepo = this.dataSource.getRepository(PageBlock);

    const pages = await pageRepo.find();
    const pageIdBySlug = Object.fromEntries(pages.map((p) => [p.slug, p.id]));

    // 키 셀렉터: pageSlug 기반 (page 재생성해도 slug로 고유)
    const existing = await blockRepo.find();
    const existingKeys = new Set(
      pages.flatMap((p) =>
        existing
          .filter((b) => b.page_id === p.id)
          .map((b) => `${p.slug}:${b.type}:${b.sort_order}`),
      ),
    );

    // pageBlocks의 content는 이미 object (JSON.parse(JSON.stringify))된 상태
    // string이면 parse, object면 그대로 사용
    const toInsert = pageBlocks
      .filter((b) => pageIdBySlug[b.pageSlug] !== undefined)
      .filter((b) => !existingKeys.has(`${b.pageSlug}:${b.type}:${b.sortOrder}`))
      .map((b) => blockRepo.create({
        page_id: pageIdBySlug[b.pageSlug],
        type: b.type,
        content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content,
        sort_order: b.sortOrder,
        is_visible: b.isVisible,
      }));

    if (toInsert.length > 0) {
      await blockRepo.save(toInsert);
    }
    console.log(`✓ Page blocks: ${toInsert.length} inserted, ${existing.length} existing`);
  }
}
