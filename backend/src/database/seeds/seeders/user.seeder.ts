import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { User } from '../../../modules/users/entities/user.entity';
import { users } from '../data/seed-data';

export class UserSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const repo = this.dataSource.getRepository(User);
    const inserted = await this.upsert(repo, users as any[], (u) => u.email);
    console.log(`✓ Users: ${inserted} inserted, ${users.length - inserted} existing`);
  }
}
