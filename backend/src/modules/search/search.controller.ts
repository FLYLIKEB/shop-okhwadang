import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class SearchController {
  @Get('popular')
  @Public()
  popular(): { keywords: string[] } {
    return { keywords: ['자사호', '보이차', '다구', '찻잔', '개완', '숙차', '생차', '다반'] };
  }
}
