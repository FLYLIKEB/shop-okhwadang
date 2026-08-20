import { QueryRunner } from 'typeorm';
import { ShowTeapotSubcategoriesOnHome1788100000000 } from '../migrations/1788100000000-ShowTeapotSubcategoriesOnHome';

describe('show teapot subcategories on home migration', () => {
  it('replaces the legacy home category selection with active teapot children', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 10 }, { id: '11' }])
      .mockResolvedValueOnce([{ id: 105, content: { title: '상품', category_ids: [1, 2, 3, 4] } }])
      .mockResolvedValueOnce(undefined);
    const migration = new ShowTeapotSubcategoriesOnHome1788100000000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[3][0]).toBe('UPDATE `page_blocks` SET `content` = ? WHERE `id` = ?');
    expect(JSON.parse(query.mock.calls[3][1][0] as string)).toEqual({
      title: '상품',
      category_ids: [10, 11],
    });
    expect(query.mock.calls[3][1][1]).toBe(105);
  });

  it('does not overwrite a CMS selection that is no longer the legacy default', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 10 }])
      .mockResolvedValueOnce([{ id: 105, content: { category_ids: [10] } }]);
    const migration = new ShowTeapotSubcategoriesOnHome1788100000000();

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(3);
  });
});
