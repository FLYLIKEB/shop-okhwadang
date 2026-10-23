import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';
import { QueryProductsDto } from './query-products.dto';
import { AdminOrderQueryDto } from '../../admin/dto/admin-order-query.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('pre-order DTO validation', () => {
  it.each([CreateProductDto, UpdateProductDto])('validates date-only shipping dates in %p', async (metatype) => {
    for (const date of ['2026-02-30', '2026-12-01T00:00:00Z', '', 'tomorrow']) {
      await expect(pipe.transform({ name: 'p', slug: 'p', price: 1, preOrderShippingDate: date }, { type: 'body', metatype })).rejects.toThrow(BadRequestException);
    }
    await expect(pipe.transform({ name: 'p', slug: 'p', price: 1, isPreOrder: true, preOrderShippingDate: '2026-12-01' }, { type: 'body', metatype })).resolves.toMatchObject({ isPreOrder: true, preOrderShippingDate: '2026-12-01' });
  });

  it.each([QueryProductsDto, AdminOrderQueryDto])('strictly parses the filter in %p', async (metatype) => {
    for (const value of ['true', 'false']) {
      await expect(pipe.transform({ isPreOrder: value }, { type: 'query', metatype })).resolves.toMatchObject({ isPreOrder: value === 'true' });
    }
    for (const value of ['yes', '0', '', null, 1]) {
      await expect(pipe.transform({ isPreOrder: value }, { type: 'query', metatype })).rejects.toThrow(BadRequestException);
    }
  });
});
