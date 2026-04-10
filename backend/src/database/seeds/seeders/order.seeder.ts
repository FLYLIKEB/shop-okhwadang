import { DataSource } from 'typeorm';
import { Seeder } from '../base/seeder';
import { Order } from '../../../modules/orders/entities/order.entity';
import { OrderItem } from '../../../modules/orders/entities/order-item.entity';
import { Review } from '../../../modules/reviews/entities/review.entity';
import { orders, orderItems, reviews } from '../data/seed-data';
import { OrderStatus } from '../../../modules/orders/entities/order.entity';

export class OrderSeeder extends Seeder {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  async run(): Promise<void> {
    await this.deleteAll(Review);
    await this.deleteAll(OrderItem);
    await this.deleteAll(Order);
    
    await this.dataSource.getRepository(Order).insert(orders as any);
    console.log(`✓ Seeded ${orders.length} orders`);

    await this.dataSource.getRepository(OrderItem).insert(orderItems as any);
    console.log(`✓ Seeded ${orderItems.length} order items`);

    await this.dataSource.getRepository(Review).insert(reviews as any);
    console.log(`✓ Seeded ${reviews.length} reviews`);
  }
}
