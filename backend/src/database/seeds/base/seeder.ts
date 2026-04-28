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
    const toUpdate = seedData.filter((s) => existingKeys.has(keySelector(s as T)));
    if (toInsert.length > 0) {
      await repo.insert(toInsert as Parameters<typeof repo.insert>[0]);
    }
    const knownColumns = new Set(repo.metadata.columns.map((c) => c.propertyName));
    for (const item of toUpdate) {
      const updateData = Object.fromEntries(
        Object.entries(item as Record<string, unknown>).filter(([k]) => knownColumns.has(k)),
      );
      await repo.update(
        { [repo.metadata.primaryColumns[0].propertyName]: (item as Record<string, unknown>)[repo.metadata.primaryColumns[0].propertyName] } as Parameters<typeof repo.update>[0],
        updateData as Parameters<typeof repo.update>[1],
      );
    }
    return toInsert.length;
  }
}
