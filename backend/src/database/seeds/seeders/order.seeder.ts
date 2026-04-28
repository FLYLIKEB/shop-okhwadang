/* eslint-disable no-console */
import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Order } from '../../../modules/orders/entities/order.entity';
import { OrderItem } from '../../../modules/orders/entities/order-item.entity';
import { Review } from '../../../modules/reviews/entities/review.entity';
import { orders, orderItems, reviews } from '../data/seed-data';

export class OrderSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    const orderRepo = this.dataSource.getRepository(Order);
    const orderItemRepo = this.dataSource.getRepository(OrderItem);
    const reviewRepo = this.dataSource.getRepository(Review);

    const o = await this.upsert(orderRepo, orders as unknown as Partial<Order>[], (r) => String(r.id));
    const oi = await this.upsert(orderItemRepo, orderItems as unknown as Partial<OrderItem>[], (e) => `${e.orderId}:${e.productId}:${e.productOptionId ?? 'null'}`);
    const r = await this.upsert(reviewRepo, reviews as unknown as Partial<Review>[], (e) => `${e.userId}:${e.productId}:${e.orderItemId}`);

    console.log(`✓ Orders: ${o}, Order items: ${oi}, Reviews: ${r}`);
  }
}
