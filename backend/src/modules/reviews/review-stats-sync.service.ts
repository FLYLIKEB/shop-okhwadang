import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class ReviewStatsSyncService {
  constructor(private readonly dataSource: DataSource) {}

  async syncProductStats(
    productId: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    await manager.query(
      `UPDATE products p
       LEFT JOIN (
         SELECT product_id, COUNT(*) AS review_count, COALESCE(AVG(rating), 0) AS avg_rating
         FROM (
           SELECT product_id, rating FROM reviews WHERE product_id = ? AND is_visible = 1
           UNION ALL
           SELECT product_id, rating FROM external_reviews WHERE product_id = ? AND is_visible = 1
         ) all_reviews
         GROUP BY product_id
       ) rs ON rs.product_id = p.id
       SET p.review_count = COALESCE(rs.review_count, 0),
           p.avg_rating = COALESCE(rs.avg_rating, 0)
       WHERE p.id = ?`,
      [productId, productId, productId],
    );
  }
}
