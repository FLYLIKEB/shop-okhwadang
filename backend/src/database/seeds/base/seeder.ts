import { DataSource, ObjectLiteral, Repository } from 'typeorm';

export abstract class Seeder {
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  abstract run(): Promise<void>;

  protected async upsert<T extends ObjectLiteral>(
    repo: Repository<T>,
    seedData: Partial<T>[],
    keySelector: (item: T) => string,
  ): Promise<number> {
    const existing = await repo.find();
    const existingKeys = new Set(existing.map(keySelector));
    const toInsert = seedData.filter((s) => !existingKeys.has(keySelector(s as T)));
    if (toInsert.length > 0) {
      await repo.insert(toInsert as Parameters<typeof repo.insert>[0]);
    }
    return toInsert.length;
  }
}
