import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { PointsService } from './points.service';
import { AdminPointsController } from './admin-points.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointHistory, User]), AuditLogModule],
  controllers: [AdminPointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
