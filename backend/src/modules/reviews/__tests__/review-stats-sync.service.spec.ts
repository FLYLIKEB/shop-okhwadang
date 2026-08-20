import { DataSource } from 'typeorm';
import { ReviewStatsSyncService } from '../review-stats-sync.service';

describe('ReviewStatsSyncService', () => {
  const manager = {
    query: jest.fn(),
  };
  const dataSource = {
    manager,
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    manager.query.mockResolvedValue(undefined);
  });

  it('owns the mixed-source visible-review product stats policy in one SQL statement', async () => {
    const service = new ReviewStatsSyncService(dataSource);

    await service.syncProductStats(5);

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('UNION ALL'), [5, 5, 5]);
    const sql = manager.query.mock.calls[0][0] as string;
    expect(sql).toContain('FROM reviews WHERE product_id = ? AND is_visible = 1');
    expect(sql).toContain('FROM external_reviews WHERE product_id = ? AND is_visible = 1');
    expect(sql).toContain('COUNT(*) AS review_count');
    expect(sql).toContain('COALESCE(AVG(rating), 0) AS avg_rating');
    expect(sql).toContain('SET p.review_count = COALESCE(rs.review_count, 0)');
    expect(sql).toContain('p.avg_rating = COALESCE(rs.avg_rating, 0)');
  });

  it('preserves caller transaction boundaries by using the supplied EntityManager', async () => {
    const transactionManager = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReviewStatsSyncService(dataSource);

    await service.syncProductStats(9, transactionManager as never);

    expect(transactionManager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE products p'),
      [9, 9, 9],
    );
    expect(manager.query).not.toHaveBeenCalled();
  });
});
