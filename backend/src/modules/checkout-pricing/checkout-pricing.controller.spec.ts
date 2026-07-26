import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CheckoutPricingController } from './checkout-pricing.controller';
import { CheckoutPricingService } from './checkout-pricing.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CheckoutPricingPreviewDto } from './dto/checkout-pricing-preview.dto';
import { UserRole } from '../users/entities/user.entity';

describe('CheckoutPricingController', () => {
  const checkoutPricingService = {
    preview: jest.fn(),
  } as unknown as jest.Mocked<CheckoutPricingService>;

  const controller = new CheckoutPricingController(checkoutPricingService);
  const dto: CheckoutPricingPreviewDto = {
    items: [{ productId: 1, quantity: 2 }],
    zipcode: '12345',
    pointsToUse: 1000,
    userCouponId: 10,
    locale: 'ko',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks POST /checkout/pricing/preview as @Public() with OptionalJwtAuthGuard', () => {
    const handler = CheckoutPricingController.prototype.preview;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([OptionalJwtAuthGuard]);
  });

  it('derives member caller identity only from req.user presence', async () => {
    const response = { totalPayable: 12345 };
    checkoutPricingService.preview.mockResolvedValue(response as never);

    await expect(controller.preview({ user: { id: 77, email: 'member@example.com', role: UserRole.USER } }, dto)).resolves.toBe(response);
    expect(checkoutPricingService.preview).toHaveBeenCalledWith(77, dto);
  });

  it('treats missing req.user as guest even when the payload includes member-only fields', async () => {
    checkoutPricingService.preview.mockRejectedValue(new Error('guest path'));

    await expect(controller.preview({}, dto)).rejects.toThrow('guest path');
    expect(checkoutPricingService.preview).toHaveBeenCalledWith(null, dto);
  });
});
