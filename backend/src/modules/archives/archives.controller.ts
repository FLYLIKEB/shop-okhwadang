import { Controller, Get } from '@nestjs/common';
import { ArchivesService } from './archives.service';

@Controller('archives')
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get()
  async getAll() {
    const [niloTypes, processSteps, artists] = await Promise.all([
      this.archivesService.findAllNiloTypes(),
      this.archivesService.findAllProcessSteps(),
      this.archivesService.findAllArtists(),
    ]);
    return { niloTypes, processSteps, artists };
  }
}
