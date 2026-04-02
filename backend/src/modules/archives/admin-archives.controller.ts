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
import { ArchivesService } from './archives.service';
import {
  CreateNiloTypeDto,
  UpdateNiloTypeDto,
  CreateProcessStepDto,
  UpdateProcessStepDto,
  CreateArtistDto,
  UpdateArtistDto,
} from './dto/archive.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('관리자 - 아카이브')
@Controller('admin/archives')
@Roles('admin', 'super_admin')
export class AdminArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get('nilo-types')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이ilo 유형 목록 조회', description: '모든 이ilo 유형 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '이ilo 유형 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getAllNiloTypes() {
    return this.archivesService.findAllNiloTypes();
  }

  @Get('nilo-types/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이ilo 유형 상세 조회', description: '이ilo 유형 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '이ilo 유형 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '이ilo 유형을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '이ilo 유형 ID' })
  async getNiloTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findNiloTypeById(id);
  }

  @Post('nilo-types')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이ilo 유형 생성', description: '새로운 이ilo 유형을 생성합니다.' })
  @ApiResponse({ status: 201, description: '이ilo 유형 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async createNiloType(@Body() dto: CreateNiloTypeDto) {
    return this.archivesService.createNiloType(dto);
  }

  @Patch('nilo-types/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이ilo 유형 수정', description: '기존 이ilo 유형 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '이ilo 유형 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '이ilo 유형을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '이ilo 유형 ID' })
  async updateNiloType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNiloTypeDto,
  ) {
    return this.archivesService.updateNiloType(id, dto);
  }

  @Delete('nilo-types/:id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이ilo 유형 삭제', description: '이ilo 유형을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '이ilo 유형 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '이ilo 유형을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '이ilo 유형 ID' })
  async deleteNiloType(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteNiloType(id);
  }

  @Patch('nilo-types/reorder')
  @ApiCookieAuth()
  @ApiOperation({ summary: '이ilo 유형 순서 변경', description: '이ilo 유형들의 순서를 변경합니다.' })
  @ApiResponse({ status: 200, description: '이ilo 유형 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async reorderNiloTypes(@Body() items: { id: number; sortOrder: number }[]) {
    await this.archivesService.reorderNiloTypes(items);
  }

  @Get('process-steps')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공정 단계 목록 조회', description: '모든 공정 단계 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '공정 단계 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getAllProcessSteps() {
    return this.archivesService.findAllProcessSteps();
  }

  @Get('process-steps/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공정 단계 상세 조회', description: '공정 단계 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '공정 단계 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공정 단계를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공정 단계 ID' })
  async getProcessStepById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findProcessStepById(id);
  }

  @Post('process-steps')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공정 단계 생성', description: '새로운 공정 단계를 생성합니다.' })
  @ApiResponse({ status: 201, description: '공정 단계 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async createProcessStep(@Body() dto: CreateProcessStepDto) {
    return this.archivesService.createProcessStep(dto);
  }

  @Patch('process-steps/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '공정 단계 수정', description: '기존 공정 단계 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '공정 단계 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공정 단계를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공정 단계 ID' })
  async updateProcessStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcessStepDto,
  ) {
    return this.archivesService.updateProcessStep(id, dto);
  }

  @Delete('process-steps/:id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '공정 단계 삭제', description: '공정 단계를 삭제합니다.' })
  @ApiResponse({ status: 204, description: '공정 단계 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공정 단계를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '공정 단계 ID' })
  async deleteProcessStep(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteProcessStep(id);
  }

  @Get('artists')
  @ApiCookieAuth()
  @ApiOperation({ summary: '작가 목록 조회', description: '모든 작가 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '작가 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async getAllArtists() {
    return this.archivesService.findAllArtists();
  }

  @Get('artists/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '작가 상세 조회', description: '작가 ID로 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '작가 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '작가를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '작가 ID' })
  async getArtistById(@Param('id', ParseIntPipe) id: number) {
    return this.archivesService.findArtistById(id);
  }

  @Post('artists')
  @ApiCookieAuth()
  @ApiOperation({ summary: '작가 생성', description: '새로운 작가를 생성합니다.' })
  @ApiResponse({ status: 201, description: '작가 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async createArtist(@Body() dto: CreateArtistDto) {
    return this.archivesService.createArtist(dto);
  }

  @Patch('artists/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '작가 수정', description: '기존 작가 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '작가 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '작가를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '작가 ID' })
  async updateArtist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArtistDto,
  ) {
    return this.archivesService.updateArtist(id, dto);
  }

  @Delete('artists/:id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '작가 삭제', description: '작가를 삭제합니다.' })
  @ApiResponse({ status: 204, description: '작가 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '작가를 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '작가 ID' })
  async deleteArtist(@Param('id', ParseIntPipe) id: number) {
    await this.archivesService.deleteArtist(id);
  }

  @Patch('artists/reorder')
  @ApiCookieAuth()
  @ApiOperation({ summary: '작가 순서 변경', description: '작가들의 순서를 변경합니다.' })
  @ApiResponse({ status: 200, description: '작가 순서 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async reorderArtists(@Body() items: { id: number; sortOrder: number }[]) {
    await this.archivesService.reorderArtists(items);
  }
}
