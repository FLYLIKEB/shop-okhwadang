import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReviewQueryDto } from '../modules/reviews/dto/review-query.dto';
import { AdminOrderQueryDto } from '../modules/admin/dto/admin-order-query.dto';
import { AdminMembersQueryDto } from '../modules/admin/dto/admin-members-query.dto';

describe('query DTO limit validation', () => {
  it.each([
    ['ReviewQueryDto', ReviewQueryDto],
    ['AdminOrderQueryDto', AdminOrderQueryDto],
    ['AdminMembersQueryDto', AdminMembersQueryDto],
  ])('%s rejects limit values above 100', async (_name, DtoClass) => {
    const dto = plainToInstance(DtoClass, { limit: 101 });
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('limit');
    expect(errors[0]?.constraints).toMatchObject({
      max: 'limit은 100 이하여야 합니다.',
    });
  });
});
