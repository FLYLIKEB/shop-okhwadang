import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestockAlert } from './entities/restock-alert.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { RestockAlertsService } from './restock-alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestockAlert, User, Product, ProductOption])],
  providers: [RestockAlertsService],
  exports: [RestockAlertsService],
})
export class RestockAlertsModule {}
