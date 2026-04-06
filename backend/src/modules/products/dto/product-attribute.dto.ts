import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, Min, MaxLength } from 'class-validator';

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
