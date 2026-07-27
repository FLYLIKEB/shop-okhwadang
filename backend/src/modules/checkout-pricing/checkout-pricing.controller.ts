import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RequestWithAuthUser } from '../../common/interfaces/auth-user.interface';
import { CheckoutPricingService } from './checkout-pricing.service';
import { CheckoutPricingPreviewDto, CheckoutPricingPreviewResponse } from './dto/checkout-pricing-preview.dto';

@ApiTags('체크아웃 가격 미리보기')
@Controller('checkout/pricing')
export class CheckoutPricingController {
  constructor(private readonly checkoutPricingService: CheckoutPricingService) {}

  @Post('preview')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: '체크아웃 가격 미리보기', description: '회원/비회원 체크아웃의 최종 결제 예정 금액을 계산합니다.' })
  @ApiResponse({ status: 200, type: CheckoutPricingPreviewResponse })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  preview(
    @Request() req: RequestWithAuthUser,
    @Body() dto: CheckoutPricingPreviewDto,
  ): Promise<CheckoutPricingPreviewResponse> {
    return this.checkoutPricingService.preview(req.user?.id ?? null, dto);
  }
}
