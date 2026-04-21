import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateAddressDto } from '../modules/users/dto/create-address.dto';
import { UpdateAddressDto } from '../modules/users/dto/update-address.dto';
import { CreateCategoryDto } from '../modules/products/dto/create-category.dto';
import { UpdateCategoryDto } from '../modules/products/dto/update-category.dto';
import { CreateNavigationItemDto } from '../modules/navigation/dto/create-navigation-item.dto';
import { UpdateNavigationItemDto } from '../modules/navigation/dto/update-navigation-item.dto';

type DtoClass = new () => object;

function hasValidationError(errors: ValidationError[], property: string): boolean {
  return errors.some((error) => error.property === property);
}

function getSwaggerApiPropertyMetadata(dtoClass: DtoClass, propertyKey: string): Record<string, unknown> {
  const metadataKey = Reflect
    .getMetadataKeys(dtoClass.prototype, propertyKey)
    .find((key): key is string => typeof key === 'string' && key.includes('swagger/apiModelProperties'));

  if (!metadataKey) {
    throw new Error(`Swagger ApiProperty metadata not found: ${dtoClass.name}.${propertyKey}`);
  }

  return Reflect.getMetadata(metadataKey, dtoClass.prototype, propertyKey) as Record<string, unknown>;
}

describe('Create/Update DTO PartialType 회귀', () => {
  describe('users address DTO', () => {
    it('update DTO는 모든 필드를 생략해도 유효하다', async () => {
      const dto = plainToInstance(UpdateAddressDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('create validator 제약(IsNotEmpty)이 update DTO에서도 유지된다', async () => {
      const dto = plainToInstance(UpdateAddressDto, { recipientName: '' });
      const errors = await validate(dto);

      expect(hasValidationError(errors, 'recipientName')).toBe(true);
    });
  });

  describe('products category DTO', () => {
    it('slug Swagger 메타데이터(설명/예시)를 create DTO와 동일하게 유지한다', () => {
      const createMetadata = getSwaggerApiPropertyMetadata(CreateCategoryDto, 'slug');
      const updateMetadata = getSwaggerApiPropertyMetadata(UpdateCategoryDto, 'slug');

      expect(updateMetadata.description).toBe(createMetadata.description);
      expect(updateMetadata.example).toBe(createMetadata.example);
      expect(updateMetadata.required).toBe(false);
    });
  });

  describe('navigation item DTO', () => {
    it('sort_order Swagger 메타데이터(설명/예시)를 create DTO와 동일하게 유지한다', () => {
      const createMetadata = getSwaggerApiPropertyMetadata(CreateNavigationItemDto, 'sort_order');
      const updateMetadata = getSwaggerApiPropertyMetadata(UpdateNavigationItemDto, 'sort_order');

      expect(updateMetadata.description).toBe(createMetadata.description);
      expect(updateMetadata.example).toBe(createMetadata.example);
      expect(updateMetadata.required).toBe(false);
    });
  });
});
