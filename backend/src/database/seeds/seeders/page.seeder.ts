/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Page } from '../../../modules/pages/entities/page.entity';
import { pages } from '../data/seed-data';

export class PageSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(Page);
    const inserted = await this.upsert(repo, pages as unknown as Partial<Page>[], (p) => p.slug);

    let updated = 0;
    for (const page of pages) {
      const result = await repo.update(
        { slug: page.slug },
        {
          title: page.title,
          template: page.template,
          is_published: page.isPublished,
        },
      );
      updated += result.affected ?? 0;
    }

    console.log(`✓ Pages: ${inserted} inserted, ${updated - inserted} updated, ${pages.length - updated} unchanged`);
  }
}
