import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementBar } from './entities/announcement-bar.entity';
import { AnnouncementBarsService } from './announcement-bars.service';
import { AnnouncementBarsController } from './announcement-bars.controller';
import { AdminAnnouncementBarsController } from './admin-announcement-bars.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementBar])],
  controllers: [AnnouncementBarsController, AdminAnnouncementBarsController],
  providers: [AnnouncementBarsService],
  exports: [AnnouncementBarsService],
})
export class AnnouncementBarsModule {}
