import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, Min, MaxLength } from 'class-validator';

export interface AttributeValueOption {
  value: string;
  displayValue: string | null;
  productCount?: number;
}

export class CreateProductAttributeDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  attributeTypeId!: number;

  @ApiProperty({ example: 'zhuni', description: '속성 값' })
  @IsString()
  @MaxLength(255)
  value!: string;

  @ApiPropertyOptional({ example: '주니', description: '표시 값' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayValue?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProductAttributeDto {
  @ApiPropertyOptional({ example: 'zhuni' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  value?: string;

  @ApiPropertyOptional({ example: '주니' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class SetProductAttributeItemDto {
  @ApiProperty({ example: 1, description: 'AttributeType ID' })
  @IsNumber()
  attributeTypeId!: number;

  @ApiProperty({ example: 'zhuni', description: '속성 값' })
  @IsString()
  @MaxLength(255)
  value!: string;

  @ApiPropertyOptional({ example: '주니' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class SetProductAttributesDto {
  @ApiProperty({
    description: '설정할 속성 목록',
    type: [SetProductAttributeItemDto],
  })
  @IsArray()
  attributes!: SetProductAttributeItemDto[];
}

export interface AttributeValueLinkedProduct {
  id: number;
  name: string;
  slug: string;
}

export interface ManagedAttributeValueOption extends AttributeValueOption {
  id: number | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  products: AttributeValueLinkedProduct[];
}

export class UpdateAttributeValueOptionDto {
  @ApiPropertyOptional({ example: '녹니', description: '표시 이름' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayValue?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LinkAttributeValueProductDto {
  @ApiProperty({ example: 1, description: '연결할 상품 ID' })
  @IsNumber()
  productId!: number;
}
