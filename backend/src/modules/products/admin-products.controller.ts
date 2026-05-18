import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';

@ApiTags('관리자 - 상품')
@Controller('admin/products')
@Roles('admin', 'super_admin')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '관리자 상품 목록 조회', description: '모든 상태의 상품을 필터링하여 조회합니다.' })
  @ApiResponse({ status: 200, description: '관리자 상품 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '상품 상태 필터' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query, true);
  }
}
