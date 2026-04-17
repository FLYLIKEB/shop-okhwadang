import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { User } from '../users/entities/user.entity';
import { InquiriesController, AdminInquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, User])],
  controllers: [InquiriesController, AdminInquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
