import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, MaxLength, Min,
  ValidateNested, ValidateIf, IsNotEmpty,
} from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productId!: number;

  @IsOptional()
  @ValidateIf((o: OrderItemDto) => o.productOptionId !== null)
  @IsInt()
  productOptionId?: number | null;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  recipientPhone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  zipcode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsUsed?: number;
}
