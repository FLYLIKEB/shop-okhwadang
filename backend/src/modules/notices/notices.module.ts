import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity';
import { NoticesController, AdminNoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notice])],
  controllers: [NoticesController, AdminNoticesController],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}
