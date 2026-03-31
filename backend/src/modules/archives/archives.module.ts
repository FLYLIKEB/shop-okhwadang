import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NiloType, ProcessStep, Artist } from './entities/archive.entity';
import { ArchivesController } from './archives.controller';
import { AdminArchivesController } from './admin-archives.controller';
import { ArchivesService } from './archives.service';

@Module({
  imports: [TypeOrmModule.forFeature([NiloType, ProcessStep, Artist])],
  controllers: [ArchivesController, AdminArchivesController],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
