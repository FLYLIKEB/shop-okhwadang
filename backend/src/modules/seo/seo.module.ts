import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Page } from '../pages/entities/page.entity';
import { JournalEntry } from '../journal/entities/journal-entry.entity';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Page, JournalEntry])],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
