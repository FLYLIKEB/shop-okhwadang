import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

export abstract class Seeder {
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  abstract run(): Promise<void>;

  protected async deleteAll<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
  ): Promise<void> {
    await this.dataSource
      .getRepository(entity)
      .createQueryBuilder()
      .delete()
      .execute();
  }
}
