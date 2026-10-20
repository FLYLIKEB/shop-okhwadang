import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Page } from './entities/page.entity';
import { PageBlock } from './entities/page-block.entity';
import { PagesController } from './pages.controller';
import { AdminPagesController } from './admin-pages.controller';
import { PagesService } from './pages.service';
import { IdempotencyService } from '../../common/services/idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([Page, PageBlock])],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService, IdempotencyService],
  exports: [PagesService],
})
export class PagesModule {}
