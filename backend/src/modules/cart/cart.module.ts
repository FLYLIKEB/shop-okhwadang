import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { User } from '../users/entities/user.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { IdempotencyOperation } from '../../common/entities/idempotency-operation.entity';
import { IdempotencyService } from '../../common/services/idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, Product, ProductOption, User, IdempotencyOperation])],
  controllers: [CartController],
  providers: [CartService, IdempotencyService],
  exports: [CartService],
})
export class CartModule {}
