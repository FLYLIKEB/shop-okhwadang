import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors) => new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})).join(', ')),
});

describe('product language policy DTOs', () => {
  it('rejects Japanese/Chinese product fields on create', async () => {
    await expect(
      validationPipe.transform(
        {
          name: '테스트 상품',
          slug: 'test-product',
          price: 1000,
          nameEn: 'Test product',
          nameJa: '日本語',
          nameZh: '中文',
        },
        { type: 'body', metatype: CreateProductDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects Japanese/Chinese product fields on update', async () => {
    await expect(
      validationPipe.transform(
        { descriptionJa: '日本語', shortDescriptionZh: '中文' },
        { type: 'body', metatype: UpdateProductDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
