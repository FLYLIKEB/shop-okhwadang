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
    const existingByKey = new Map(existing.map((item) => [keySelector(item), item]));
    const toInsert = seedData.filter((s) => !existingKeys.has(keySelector(s as T)));
    const toUpdate = seedData.filter((s) => existingKeys.has(keySelector(s as T)));
    if (toInsert.length > 0) {
      await repo.insert(toInsert as Parameters<typeof repo.insert>[0]);
    }
    const knownColumns = new Set(repo.metadata.columns.map((c) => c.propertyName));
    const primaryColumn = repo.metadata.primaryColumns[0].propertyName;
    for (const item of toUpdate) {
      const existingItem = existingByKey.get(keySelector(item as T));
      if (!existingItem) continue;

      const updateData = Object.fromEntries(
        Object.entries(item as Record<string, unknown>).filter(
          ([k]) => k !== primaryColumn && knownColumns.has(k),
        ),
      );
      await repo.update(
        { [primaryColumn]: (existingItem as Record<string, unknown>)[primaryColumn] } as Parameters<typeof repo.update>[0],
        updateData as Parameters<typeof repo.update>[1],
      );
    }
    return toInsert.length;
  }
}
