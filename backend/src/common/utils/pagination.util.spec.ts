import { paginate } from './pagination.util';

function createQueryBuilderMock() {
  const getManyAndCount = jest.fn().mockResolvedValue([[], 0] as const);
  const take = jest.fn().mockReturnValue({ getManyAndCount });
  const skip = jest.fn().mockReturnValue({ take });
  const qb = { skip } as never;

  return { qb, skip, take, getManyAndCount };
}

describe('paginate', () => {
  it('applies shared defaults before skip/take', async () => {
    const { qb, skip, take } = createQueryBuilderMock();

    const result = await paginate(qb, {});

    expect(skip).toHaveBeenCalledWith(0);
    expect(take).toHaveBeenCalledWith(20);
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('clamps limit to 100 before applying skip/take', async () => {
    const { qb, skip, take } = createQueryBuilderMock();

    const result = await paginate(qb, { page: 2, limit: 1000 });

    expect(skip).toHaveBeenCalledWith(100);
    expect(take).toHaveBeenCalledWith(100);
    expect(result).toEqual({ items: [], total: 0, page: 2, limit: 100 });
  });

  it.each([0, -1])('clamps limit=%s up to 1', async (limit) => {
    const { qb, skip, take } = createQueryBuilderMock();

    const result = await paginate(qb, { page: 3, limit });

    expect(skip).toHaveBeenCalledWith(2);
    expect(take).toHaveBeenCalledWith(1);
    expect(result).toEqual({ items: [], total: 0, page: 3, limit: 1 });
  });
});
