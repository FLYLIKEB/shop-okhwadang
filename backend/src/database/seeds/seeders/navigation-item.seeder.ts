import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { NavigationItem } from '../../../modules/navigation/entities/navigation-item.entity';
import { navigationItems } from '../data/seed-data';

export class NavigationItemSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(NavigationItem);
    const inserted = await this.upsert(repo, navigationItems as any, (e) => `${e.group}:${e.sort_order}`);
    console.log(`✓ Navigation items: ${inserted} inserted, ${navigationItems.length - inserted} existing`);
  }
}
