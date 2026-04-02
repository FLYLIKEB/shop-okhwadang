import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 컬렉션')
@Controller('admin/collections')
@Roles('admin', 'super_admin')
export class AdminCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '전체 컬렉션 목록 조회', description: '모든 컬렉션 목록을 조회합니다. (비활성 포함)' })
  @ApiResponse({ status: 200, description: '컬렉션 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getAll() {
    return this.collectionsService.findAll();
  }

  @Get(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '컬렉션 상세 조회', description: '컬렉션 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '컬렉션 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '컬렉션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '컬렉션 ID' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.collectionsService.findById(id);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '컬렉션 생성', description: '새로운 컬렉션을 생성합니다.' })
  @ApiResponse({ status: 201, description: '컬렉션 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '컬렉션 수정', description: '기존 컬렉션 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '컬렉션 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '컬렉션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '컬렉션 ID' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '컬렉션 삭제', description: '컬렉션을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '컬렉션 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '컬렉션을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '컬렉션 ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.collectionsService.remove(id);
  }

  @Patch('reorder')
  @ApiCookieAuth()
  @ApiOperation({ summary: '컬렉션 순서 변경', description: '컬렉션들의 순서를 변경합니다.' })
  @ApiResponse({ status: 200, description: '컬렉션 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async reorder(@Body() items: { id: number; sortOrder: number }[]) {
    await this.collectionsService.reorder(items);
  }
}
