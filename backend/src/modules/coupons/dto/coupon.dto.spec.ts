import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateCouponDto } from './create-coupon.dto';
import { UpdateCouponDto } from './update-coupon.dto';
import { IssueCouponDto } from './issue-coupon.dto';
import { CalculateDiscountDto } from './calculate-discount.dto';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})).join(', ')),
});

const validCreateCoupon = {
  code: ' WELCOME10 ',
  name: ' 신규 쿠폰 ',
  type: 'percentage',
  value: 10,
  minOrderAmount: 0,
  maxDiscount: 5000,
  totalQuantity: 100,
  startsAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-02-01T00:00:00.000Z',
  isActive: true,
};

describe('coupon DTO validation', () => {
  it('trims code/name and accepts explicit nullable coupon limits', async () => {
    const result = await validationPipe.transform(
      { ...validCreateCoupon, maxDiscount: null, totalQuantity: null },
      { type: 'body', metatype: CreateCouponDto },
    ) as CreateCouponDto;

    expect(result.code).toBe('WELCOME10');
    expect(result.name).toBe('신규 쿠폰');
    expect(result.maxDiscount).toBeNull();
    expect(result.totalQuantity).toBeNull();
  });

  it('accepts maxDiscount 0 as an intentional zero discount cap', async () => {
    const result = await validationPipe.transform(
      { ...validCreateCoupon, maxDiscount: 0 },
      { type: 'body', metatype: CreateCouponDto },
    ) as CreateCouponDto;

    expect(result.maxDiscount).toBe(0);
  });

  it.each([
    [{ ...validCreateCoupon, code: '   ' }],
    [{ ...validCreateCoupon, name: '   ' }],
    [{ ...validCreateCoupon, value: 0 }],
    [{ ...validCreateCoupon, value: 10000000000 }],
    [{ ...validCreateCoupon, value: 10.123 }],
    [{ ...validCreateCoupon, totalQuantity: 1.5 }],
    [{ ...validCreateCoupon, totalQuantity: 2147483648 }],
  ])('rejects invalid coupon create payload %#', async (payload) => {
    await expect(
      validationPipe.transform(payload, { type: 'body', metatype: CreateCouponDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [{ code: null }],
    [{ name: null }],
    [{ value: null }],
    [{ minOrderAmount: null }],
    [{ startsAt: null }],
    [{ expiresAt: null }],
    [{ isActive: null }],
    [{ totalQuantity: 1.5 }],
  ])('rejects null or fractional nonnullable coupon patch payload %#', async (payload) => {
    await expect(
      validationPipe.transform(payload, { type: 'body', metatype: UpdateCouponDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows nullable coupon patch fields that are intentionally clearable', async () => {
    const result = await validationPipe.transform(
      { maxDiscount: null, totalQuantity: null },
      { type: 'body', metatype: UpdateCouponDto },
    ) as UpdateCouponDto;

    expect(result).toEqual({ maxDiscount: null, totalQuantity: null });
  });

  it.each([
    [{ couponId: 1.2, userId: 1 }, IssueCouponDto],
    [{ couponId: 1, userId: 0 }, IssueCouponDto],
    [{ orderAmount: 1000, zipcode: '04524', items: [{ productId: 1, quantity: 1 }], userCouponId: null }, CalculateDiscountDto],
    [{ orderAmount: 1000, zipcode: '04524', items: [{ productId: 1, quantity: 1.5 }] }, CalculateDiscountDto],
    [{ orderAmount: 1000, zipcode: '04524', items: [{ productId: 1, productOptionId: null, quantity: 1 }], pointsToUse: 1.5 }, CalculateDiscountDto],
  ])('rejects invalid coupon IDs and quantities %#', async (payload, metatype) => {
    await expect(
      validationPipe.transform(payload, { type: 'body', metatype }),
    ).rejects.toThrow(BadRequestException);
  });
});
