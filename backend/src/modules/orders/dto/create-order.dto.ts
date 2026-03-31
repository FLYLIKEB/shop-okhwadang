import { Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, MaxLength, Min,
  ValidateNested, ValidateIf, IsNotEmpty,
} from 'class-validator';

export class OrderItemDto {
  @IsInt({ message: '상품 ID는 정수여야 합니다.' })
  productId!: number;

  @IsOptional()
  @ValidateIf((o: OrderItemDto) => o.productOptionId !== null)
  @IsInt({ message: '상품 옵션 ID는 정수여야 합니다.' })
  productOptionId?: number | null;

  @IsInt({ message: '수량은 정수여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray({ message: '주문 상품 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsString({ message: '수령인 이름을 입력해 주세요.' })
  @IsNotEmpty({ message: '수령인 이름을 입력해 주세요.' })
  @MaxLength(100, { message: '수령인 이름은 최대 100자까지 입력 가능합니다.' })
  recipientName!: string;

  @IsString({ message: '수령인 연락처를 입력해 주세요.' })
  @IsNotEmpty({ message: '수령인 연락처를 입력해 주세요.' })
  @MaxLength(20, { message: '수령인 연락처는 최대 20자까지 입력 가능합니다.' })
  recipientPhone!: string;

  @IsString({ message: '우편번호를 입력해 주세요.' })
  @IsNotEmpty({ message: '우편번호를 입력해 주세요.' })
  @MaxLength(10, { message: '우편번호는 최대 10자까지 입력 가능합니다.' })
  zipcode!: string;

  @IsString({ message: '주소를 입력해 주세요.' })
  @IsNotEmpty({ message: '주소를 입력해 주세요.' })
  @MaxLength(255, { message: '주소는 최대 255자까지 입력 가능합니다.' })
  address!: string;

  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  @MaxLength(255, { message: '상세 주소는 최대 255자까지 입력 가능합니다.' })
  addressDetail?: string | null;

  @IsOptional()
  @IsString({ message: '배송 메모는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '배송 메모는 최대 500자까지 입력 가능합니다.' })
  memo?: string | null;

  @IsOptional()
  @IsInt({ message: '포인트 사용량은 정수여야 합니다.' })
  @Min(0, { message: '포인트 사용량은 0 이상이어야 합니다.' })
  pointsUsed?: number;
}
