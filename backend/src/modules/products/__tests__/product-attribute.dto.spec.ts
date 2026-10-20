import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetProductAttributesDto } from '../dto/product-attribute.dto';

describe('SetProductAttributesDto', () => {
  it.each([
    [null], [42], [{ attributeTypeId: 0, value: 'a' }],
    [{ attributeTypeId: 1.5, value: 'a' }], [{ attributeTypeId: 1, value: 2 }],
    [{ attributeTypeId: 1, value: 'a'.repeat(256) }],
    [{ attributeTypeId: 1, value: 'a', unexpected: true }],
  ])('rejects malformed nested attributes: %j', async (attribute) => {
    const dto = plainToInstance(SetProductAttributesDto, { attributes: [attribute] });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });

  it.each([[], [{ attributeTypeId: 1, value: 'a', sortOrder: 0 }]])('accepts a valid replacement: %j', async (...attributes) => {
    const dto = plainToInstance(SetProductAttributesDto, { attributes });
    expect(await validate(dto)).toEqual([]);
  });
});
