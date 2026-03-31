import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionsController } from './collections.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  imports: [TypeOrmModule.forFeature([Collection])],
  controllers: [CollectionsController, AdminCollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
