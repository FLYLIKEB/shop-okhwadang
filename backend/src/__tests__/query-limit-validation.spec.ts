import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminMembersQueryDto } from '../modules/admin/dto/admin-members-query.dto';
import { AdminOrderQueryDto } from '../modules/admin/dto/admin-order-query.dto';
import { AuditLogQueryDto } from '../modules/audit-logs/dto/audit-log-query.dto';
import { AdminCouponListQueryDto } from '../modules/coupons/dto/admin-coupon-list-query.dto';
import { AdminCouponRuleListQueryDto } from '../modules/coupons/dto/admin-coupon-rule-list-query.dto';
import { AdminInquiryQueryDto } from '../modules/inquiries/dto/admin-inquiry-query.dto';
import { AdminOrderServiceRequestQueryDto } from '../modules/orders/dto/admin-order-service-request-query.dto';
import { QueryProductsDto } from '../modules/products/dto/query-products.dto';
import { AdminReviewQueryDto } from '../modules/reviews/dto/admin-review-query.dto';
import { ReviewQueryDto } from '../modules/reviews/dto/review-query.dto';

const paginatedDtos = [
  ['AdminMembersQueryDto', AdminMembersQueryDto],
  ['AdminOrderQueryDto', AdminOrderQueryDto],
  ['AuditLogQueryDto', AuditLogQueryDto],
  ['AdminCouponListQueryDto', AdminCouponListQueryDto],
  ['AdminCouponRuleListQueryDto', AdminCouponRuleListQueryDto],
  ['AdminInquiryQueryDto', AdminInquiryQueryDto],
  ['AdminOrderServiceRequestQueryDto', AdminOrderServiceRequestQueryDto],
  ['QueryProductsDto', QueryProductsDto],
  ['AdminReviewQueryDto', AdminReviewQueryDto],
  ['ReviewQueryDto', ReviewQueryDto],
] as const;

describe('query DTO pagination validation', () => {
  it.each(paginatedDtos)('%s transforms numeric query strings for page and limit', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { page: '2', limit: '30' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(30);
  });

  it.each(paginatedDtos)('%s rejects page values below 1', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { page: 0 });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it.each(paginatedDtos)('%s rejects non-integer page values', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { page: '1.5' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it.each(paginatedDtos)('%s rejects limit values below 1', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { limit: 0 });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it.each(paginatedDtos)('%s rejects limit values above 100 with the shared Korean message', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { limit: 101 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toMatchObject({
      max: 'limit은 100 이하여야 합니다.',
    });
  });

  it.each(paginatedDtos.filter(([name]) => name !== 'ReviewQueryDto'))(
    '%s applies the shared default page and limit',
    (_name, DtoClass) => {
      const dto = plainToInstance(DtoClass, {});

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    },
  );

  it('keeps ReviewQueryDto defaultless so the public review service can retain limit=10 fallback', () => {
    const dto = plainToInstance(ReviewQueryDto, {});

    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });
});
