import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ArchivesService } from './archives.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('아카이브')
@Controller('archives')
@Public()
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get()
  @ApiOperation({ summary: '전체 아카이브 조회', description: '이ilo 유형, 공정 단계, 작가 정보를 모두 조회합니다.' })
  @ApiResponse({ status: 200, description: '아카이브 목록 조회 성공' })
  async getAll() {
    const [niloTypes, processSteps, artists] = await Promise.all([
      this.archivesService.findAllNiloTypes(),
      this.archivesService.findAllProcessSteps(),
      this.archivesService.findAllArtists(),
    ]);
    return { niloTypes, processSteps, artists };
  }
}
