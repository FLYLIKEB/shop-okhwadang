import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { NavigationItem } from '../../../modules/navigation/entities/navigation-item.entity';
import { navigationItems } from '../data/seed-data';

export class NavigationItemSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(NavigationItem);
    await this.dataSource.getRepository(NavigationItem).insert(navigationItems);
    console.log(`✓ Seeded ${navigationItems.length} navigation items`);
  }
}
