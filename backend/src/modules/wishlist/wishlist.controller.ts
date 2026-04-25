import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
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
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AuthenticatedRequestWithAuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('위시리스트')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '위시리스트 목록 조회', description: '현재 사용자의 위시리스트 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '위시리스트 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  findAll(@Request() req: AuthenticatedRequestWithAuthUser) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Get('check')
  @ApiCookieAuth()
  @ApiOperation({ summary: '위시리스트 상품 확인', description: '특정 상품이 위시리스트에 있는지 확인합니다.' })
  @ApiResponse({ status: 200, description: '위시리스트 상품 확인 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({ name: 'productId', type: Number, description: '상품 ID' })
  check(
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Query('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlistService.check(req.user.id, productId);
  }

  @Post()
  @ApiCookieAuth()
  @ApiOperation({ summary: '위시리스트에 상품 추가', description: '상품을 위시리스트에 추가합니다.' })
  @ApiResponse({ status: 201, description: '위시리스트에 상품 추가 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  create(
    @Request() req: AuthenticatedRequestWithAuthUser,
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(req.user.id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '위시리스트 상품 삭제', description: '위시리스트에서 상품을 삭제합니다.' })
  @ApiResponse({ status: 204, description: '위시리스트 상품 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '위시리스트 상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '위시리스트 ID' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequestWithAuthUser,
  ) {
    return this.wishlistService.remove(id, req.user.id);
  }
}
