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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('카테고리')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '카테고리 트리 조회', description: '활성화된 카테고리 트리 구조를 조회합니다.' })
  @ApiQuery({ name: 'locale', required: false, description: '로케일 (ko/en)', example: 'en' })
  @ApiResponse({ status: 200, description: '카테고리 트리 조회 성공' })
  findTree(@Query('locale') locale?: string) {
    return this.categoriesService.findTree(locale);
  }

  @Get('all')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 카테고리 목록 조회', description: '비활성화된 카테고리를 포함한 전체 카테고리 목록을 조회합니다.' })
  @ApiQuery({ name: 'locale', required: false, description: '로케일 (ko/en)', example: 'en' })
  @ApiResponse({ status: 200, description: '전체 카테고리 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  findAll(@Query('locale') locale?: string) {
    return this.categoriesService.findAll(locale);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '카테고리 생성', description: '새로운 카테고리를 생성합니다.' })
  @ApiResponse({ status: 201, description: '카테고리 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('reorder')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '카테고리 순서 변경', description: '카테고리의 순서를 변경합니다.' })
  @ApiResponse({ status: 204, description: '카테고리 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '카테고리 수정', description: '기존 카테고리 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '카테고리 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '카테고리 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '카테고리 삭제', description: '카테고리를 삭제합니다.' })
  @ApiResponse({ status: 204, description: '카테고리 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '카테고리 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
