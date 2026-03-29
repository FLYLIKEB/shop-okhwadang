import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class SearchController {
  @Get('popular')
  @Public()
  popular(): { keywords: string[] } {
    return { keywords: ['나이키', '아디다스', '반팔', '청바지', '운동화'] };
  }
}
