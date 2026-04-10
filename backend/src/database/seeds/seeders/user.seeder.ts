import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { User } from '../../../modules/users/entities/user.entity';
import { users } from '../data/seed-data';

export class UserSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(User);
    await this.dataSource.getRepository(User).insert(users as any);
    console.log(`✓ Seeded ${users.length} users`);
  }
}
