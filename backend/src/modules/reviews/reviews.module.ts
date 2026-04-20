import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { UploadModule } from '../upload/upload.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, OrderItem, PointHistory]),
    UploadModule,
    SettingsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
