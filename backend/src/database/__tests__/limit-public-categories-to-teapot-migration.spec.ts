import { QueryRunner } from 'typeorm';
import { LimitPublicCategoriesToTeapot1788200000000 } from '../migrations/1788200000000-LimitPublicCategoriesToTeapot';

describe('limit public categories to teapot migration', () => {
  it('deactivates categories outside the teapot tree', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 1, parent_id: null, slug: 'teapot' },
        { id: 2, parent_id: null, slug: 'puerh-tea' },
        { id: 30, parent_id: 2, slug: 'sheng-puerh' },
        { id: 10, parent_id: 1, slug: 'zhuní' },
      ])
      .mockResolvedValue(undefined);
    const migration = new LimitPublicCategoriesToTeapot1788200000000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1]).toEqual([
      'UPDATE `categories` SET `is_active` = 0 WHERE `id` = ?',
      [2],
    ]);
    expect(query.mock.calls[2]).toEqual([
      'UPDATE `categories` SET `is_active` = 0 WHERE `id` = ?',
      [30],
    ]);
  });

  it('does nothing when the teapot category is absent', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      { id: 2, parent_id: null, slug: 'puerh-tea' },
    ]);
    const migration = new LimitPublicCategoriesToTeapot1788200000000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(1);
  });
});
