import { Repository } from 'typeorm';
import { Seeder } from './seeder';

interface Row {
  id: number;
  title: string;
  titleEn?: string;
  ignored?: string;
}

class TestSeeder extends Seeder {
  async run(): Promise<void> {
    // no-op
  }

  execute(repo: Repository<Row>, seedData: Partial<Row>[]): Promise<number> {
    return this.upsert(repo, seedData, (row) => row.title);
  }
}

describe('Seeder.upsert', () => {
  it('updates existing rows by their persisted primary key when seed items omit id', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([{ id: 7, title: '배너', titleEn: null }]),
      insert: jest.fn(),
      update: jest.fn(),
      metadata: {
        primaryColumns: [{ propertyName: 'id' }],
        columns: [
          { propertyName: 'id' },
          { propertyName: 'title' },
          { propertyName: 'titleEn' },
        ],
      },
    } as unknown as Repository<Row>;
    const seeder = new TestSeeder({} as never);

    const inserted = await seeder.execute(repo, [
      { title: '배너', titleEn: 'Banner', ignored: 'not a column' },
    ]);

    expect(inserted).toBe(0);
    expect(repo.update).toHaveBeenCalledWith(
      { id: 7 },
      { title: '배너', titleEn: 'Banner' },
    );
    expect(repo.insert).not.toHaveBeenCalled();
  });
});
