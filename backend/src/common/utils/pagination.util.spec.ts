import { paginate } from './pagination.util';

describe('paginate', () => {
  it('clamps limit to 100 before applying skip/take', async () => {
    const getManyAndCount = jest.fn().mockResolvedValue([[], 0] as const);
    const take = jest.fn().mockReturnValue({ getManyAndCount });
    const skip = jest.fn().mockReturnValue({ take });
    const qb = { skip } as never;

    const result = await paginate(qb, { page: 2, limit: 1000 });

    expect(skip).toHaveBeenCalledWith(100);
    expect(take).toHaveBeenCalledWith(100);
    expect(result).toEqual({ items: [], total: 0, page: 2, limit: 100 });
  });
});
