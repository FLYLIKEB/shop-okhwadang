import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OptionalLocalePipe } from '../../common/pipes/optional-locale.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('프로모션')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '활성 프로모션 목록 조회', description: '현재 활성화된 프로모션 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로모션 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  findAll(@Query('locale', OptionalLocalePipe) locale?: string) {
    return this.promotionsService.findAllActive(locale);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '프로모션 상세 조회', description: '프로모션 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로모션 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '프로모션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '프로모션 ID' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  findOne(@Param('id', ParseIntPipe) id: number, @Query('locale', OptionalLocalePipe) locale?: string) {
    return this.promotionsService.findOne(id, locale);
  }
}

@ApiTags('배너')
@Controller('banners')
export class BannersController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '배너 목록 조회', description: '활성화된 배너 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '배너 목록 조회 성공' })
  @ApiQuery({ name: 'locale', required: false, description: '언어 코드 (ko, en)' })
  findAll(@Query('locale', OptionalLocalePipe) locale?: string) {
    return this.promotionsService.findAllActiveBanners(locale);
  }
}

@ApiTags('관리자 - 프로모션')
@Controller('admin/promotions')
@Roles('admin', 'super_admin')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '프로모션 생성', description: '새로운 프로모션을 생성합니다.' })
  @ApiResponse({ status: 201, description: '프로모션 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '프로모션 수정', description: '기존 프로모션을 수정합니다.' })
  @ApiResponse({ status: 200, description: '프로모션 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '프로모션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '프로모션 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '프로모션 삭제', description: '프로모션을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '프로모션 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '프로모션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '프로모션 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}

@ApiTags('관리자 - 배너')
@Controller('admin/banners')
@Roles('admin', 'super_admin')
export class AdminBannersController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '배너 생성', description: '새로운 배너를 생성합니다.' })
  @ApiResponse({ status: 201, description: '배너 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateBannerDto) {
    return this.promotionsService.createBanner(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배너 수정', description: '기존 배너를 수정합니다.' })
  @ApiResponse({ status: 200, description: '배너 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '배너 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBannerDto) {
    return this.promotionsService.updateBanner(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '배너 삭제', description: '배너를 삭제합니다.' })
  @ApiResponse({ status: 200, description: '배너 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '배너를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '배너 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.removeBanner(id);
  }
}
