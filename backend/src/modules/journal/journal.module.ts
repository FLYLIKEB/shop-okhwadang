import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalController } from './journal.controller';
import { AdminJournalController } from './admin-journal.controller';
import { JournalService } from './journal.service';

@Module({
  imports: [TypeOrmModule.forFeature([JournalEntry])],
  controllers: [JournalController, AdminJournalController],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
