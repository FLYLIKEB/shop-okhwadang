import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPopupsController } from './admin-popups.controller';
import { Popup } from './entities/popup.entity';
import { PopupsController } from './popups.controller';
import { PopupsService } from './popups.service';

@Module({
  imports: [TypeOrmModule.forFeature([Popup])],
  controllers: [PopupsController, AdminPopupsController],
  providers: [PopupsService],
})
export class PopupsModule {}
