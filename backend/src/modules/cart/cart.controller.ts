import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ValidateCartDto, ValidateCartResponseDto } from './dto/validate-cart.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartQuantityDto } from './dto/update-cart-quantity.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

@ApiTags('장바구니')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiCookieAuth()
  @ApiOperation({ summary: '장바구니 목록 조회', description: '현재 사용자의 장바구니 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '장바구니 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.cartService.findAll(user.id);
  }

  @Post()
  @ApiCookieAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '장바구니에 상품 추가', description: '장바구니에 새로운 상품을 추가합니다.' })
  @ApiResponse({ status: 201, description: '장바구니에 상품 추가 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  add(@CurrentUser() user: AuthUser, @Body() dto: AddToCartDto) {
    return this.cartService.add(user.id, dto);
  }

  @Post('validate')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '장바구니 재검증',
    description:
      '결제 전 장바구니 항목의 재고·단종·가격 상태를 확인합니다. 가격 정책: 가격 변동은 사용자에게 안내 후 최신 가격으로 자동 반영됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '항목별 가용성 및 이슈 목록 반환',
    type: ValidateCartResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateCartDto,
  ): Promise<ValidateCartResponseDto> {
    return this.cartService.validate(user.id, dto.itemIds);
  }

  @Patch(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '장바구니 상품 수량 수정', description: '장바구니에 있는 상품의 수량을 수정합니다.' })
  @ApiResponse({ status: 200, description: '장바구니 상품 수량 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '장바구니 상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '장바구니 아이템 ID' })
  updateQuantity(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCartQuantityDto,
  ) {
    return this.cartService.updateQuantity(id, user.id, dto);
  }

  @Delete(':id')
  @ApiCookieAuth()
  @ApiOperation({ summary: '장바구니 상품 삭제', description: '장바구니에서 상품을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '장바구니 상품 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '장바구니 상품을 찾을 수 없음' })
  @ApiParam({ name: 'id', type: Number, description: '장바구니 아이템 ID' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cartService.remove(id, user.id);
  }
}
