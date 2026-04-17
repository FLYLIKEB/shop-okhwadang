import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PointsService } from './points.service';

@Module({
  imports: [TypeOrmModule.forFeature([PointHistory])],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
