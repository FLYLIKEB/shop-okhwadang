import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  Request,
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
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkProductsDto } from './dto/bulk-products.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithAuthUser } from '../../common/interfaces/auth-user.interface';
import { RestockAlertsService } from '../restock-alerts/restock-alerts.service';
import { CreateRestockAlertDto } from '../restock-alerts/dto/create-restock-alert.dto';
import { RecentlyViewedService } from './recently-viewed.service';

@ApiTags('상품')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly restockAlertsService: RestockAlertsService,
    private readonly recentlyViewedService: RecentlyViewedService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '상품 목록 조회', description: '상품 목록을 페이지네이션 및 필터링하여 조회합니다.' })
  @ApiResponse({ status: 200, description: '상품 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: '카테고리 ID' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '검색어' })
  findAll(@Query() query: QueryProductsDto, @Request() req: RequestWithAuthUser) {
    const isAdmin = req.user?.role === 'admin';
    return this.productsService.findAll(query, isAdmin);
  }

  @Get('autocomplete')
  @Public()
  @ApiOperation({ summary: '상품 자동완성', description: '검색어 기반 상품 자동완성 제안어를 반환합니다.' })
  @ApiResponse({ status: 200, description: '자동완성 결과 반환 성공' })
  @ApiQuery({ name: 'q', required: true, type: String, description: '검색어' })
  autocomplete(@Query('q') q: string) {
    return this.productsService.autocomplete(q);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: '상품 벌크 조회', description: '여러 상품 ID로 상품 목록을 한 번에 조회합니다.' })
  @ApiResponse({ status: 200, description: '상품 목록 조회 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  bulkLookup(@Body() dto: BulkProductsDto, @Request() req: RequestWithAuthUser) {
    const isAdmin = req.user?.role === 'admin';
    return this.productsService.findBulk(dto.ids, isAdmin);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '상품 상세 조회', description: '상품 ID로 상품 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '상품 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '상품 ID' })
  @ApiQuery({ name: 'locale', required: false, type: String, description: ' locale (ko/en)' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale: string | undefined,
    @Request() req: RequestWithAuthUser,
  ) {
    const isAdmin = req.user?.role === 'admin';
    const result = await this.productsService.findOne(id, isAdmin, locale);

    if (req.user?.id) {
      this.recentlyViewedService
        .upsert(req.user.id, id)
        .catch(() => undefined);
    }

    return result;
  }

  @Post()
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '상품 생성', description: '새로운 상품을 생성합니다.' })
  @ApiResponse({ status: 201, description: '상품 생성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post(':id/restock-alert')
  @ApiCookieAuth()
  @ApiOperation({ summary: '재입고 알림 신청', description: '품절된 상품 또는 옵션의 재입고 알림을 신청합니다.' })
  @ApiResponse({ status: 201, description: '재입고 알림 신청 성공' })
  @ApiResponse({ status: 400, description: '이미 재고가 있거나 잘못된 요청' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '상품 또는 옵션을 찾을 수 없음' })
  subscribeRestockAlert(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestWithAuthUser['user'],
    @Body() dto: CreateRestockAlertDto,
  ) {
    return this.restockAlertsService.createAlert(user!.id, id, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '상품 수정', description: '기존 상품 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '상품 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '상품 ID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiCookieAuth()
  @ApiOperation({ summary: '상품 삭제', description: '상품을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '상품 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '상품 ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
