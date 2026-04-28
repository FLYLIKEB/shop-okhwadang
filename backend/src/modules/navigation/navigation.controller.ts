import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { OptionalLocalePipe } from '../../common/pipes/optional-locale.pipe';

const VALID_GROUPS = ['gnb', 'sidebar', 'footer'] as const;
type NavigationGroup = (typeof VALID_GROUPS)[number];
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { CreateNavigationItemDto } from './dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from './dto/update-navigation-item.dto';
import { ReorderNavigationDto } from './dto/reorder-navigation.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('네비게이션')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '네비게이션 목록 조회', description: '지정된 그룹의 활성화된 네비게이션 항목을 조회합니다.' })
  @ApiResponse({ status: 200, description: '네비게이션 목록 조회 성공' })
  @ApiResponse({ status: 400, description: 'group 파라미터 필요' })
  @ApiQuery({ name: 'group', required: true, enum: ['gnb', 'sidebar', 'footer'], description: '네비게이션 그룹' })
  @ApiQuery({ name: 'locale', required: false, example: 'en', description: '언어 코드 (ko, en)' })
  findByGroup(@Query('group') group?: string, @Query('locale', OptionalLocalePipe) locale?: string) {
    if (!group || !VALID_GROUPS.includes(group as NavigationGroup)) {
      throw new BadRequestException(
        `group 파라미터가 필요합니다. (${VALID_GROUPS.join(', ')})`,
      );
    }
    return this.navigationService.findActiveByGroup(group as NavigationGroup, locale);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '네비게이션 항목 생성', description: '새로운 네비게이션 항목을 생성합니다.' })
  @ApiResponse({ status: 201, description: '네비게이션 항목 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateNavigationItemDto) {
    return this.navigationService.create(dto);
  }

  @Patch('reorder')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '네비게이션 순서 변경', description: '네비게이션 항목들의 순서를 변경합니다.' })
  @ApiResponse({ status: 204, description: '네비게이션 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  reorder(@Body() dto: ReorderNavigationDto) {
    return this.navigationService.reorder(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '네비게이션 항목 수정', description: '기존 네비게이션 항목 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '네비게이션 항목 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '네비게이션 항목을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '네비게이션 항목 ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNavigationItemDto,
  ) {
    return this.navigationService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '네비게이션 항목 삭제', description: '네비게이션 항목을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '네비게이션 항목 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '네비게이션 항목을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '네비게이션 항목 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.navigationService.remove(id);
  }
}
