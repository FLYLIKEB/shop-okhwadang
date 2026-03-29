import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { Banner } from './entities/banner.entity';
import {
  PromotionsController,
  BannersController,
  AdminPromotionsController,
  AdminBannersController,
} from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Banner])],
  controllers: [
    PromotionsController,
    BannersController,
    AdminPromotionsController,
    AdminBannersController,
  ],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
