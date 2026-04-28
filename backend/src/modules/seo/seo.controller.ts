import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SeoService } from './seo.service';

@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Public()
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: '동적 sitemap.xml 생성' })
  @ApiResponse({ status: 200, description: 'sitemap.xml 생성 성공' })
  async getSitemap(): Promise<string> {
    return this.seoService.generateSitemapXml();
  }

  @Get('robots.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: '동적 robots.txt 생성' })
  @ApiResponse({ status: 200, description: 'robots.txt 생성 성공' })
  getRobots(): string {
    return this.seoService.generateRobotsTxt();
  }
}
