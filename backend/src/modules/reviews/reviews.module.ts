import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { ExternalReview } from './entities/external-review.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { Product } from '../products/entities/product.entity';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { AdminReviewsService } from './admin-reviews.service';
import { SmartStoreReviewImportService } from './smartstore-review-import.service';
import { UploadModule } from '../upload/upload.module';
import { SettingsModule } from '../settings/settings.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ExternalReview, OrderItem, PointHistory, Product]),
    UploadModule,
    SettingsModule,
    PointsModule,
  ],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService, AdminReviewsService, SmartStoreReviewImportService],
  exports: [ReviewsService, AdminReviewsService, SmartStoreReviewImportService],
})
export class ReviewsModule {}
