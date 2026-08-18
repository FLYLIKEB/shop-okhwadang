import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsInt, IsOptional, IsString, MaxLength, Min,
  ValidateNested, ValidateIf, IsNotEmpty, IsBoolean, IsIn,
} from 'class-validator';
export class OrderItemDto {
  @ApiProperty({ example: 1, description: '상품 ID' })
  @IsInt({ message: '상품 ID는 정수여야 합니다.' })
  productId!: number;

  @ApiProperty({ example: null, description: '상품 옵션 ID', required: false })
  @IsOptional()
  @ValidateIf((o: OrderItemDto) => o.productOptionId !== null)
  @IsInt({ message: '상품 옵션 ID는 정수여야 합니다.' })
  productOptionId?: number | null;

  @ApiProperty({ example: 2, description: '수량' })
  @IsInt({ message: '수량은 정수여야 합니다.' })
  @Min(1, { message: '수량은 최소 1개 이상이어야 합니다.' })
  quantity!: number;
}


export class PolicyConsentSnapshotDto {
  @ApiProperty({ example: 'terms', description: '정책 문서 slug' })
  @IsString({ message: '정책 문서 식별자는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '정책 문서 식별자를 입력해 주세요.' })
  @MaxLength(100, { message: '정책 문서 식별자는 최대 100자까지 입력 가능합니다.' })
  slug!: string;

  @ApiProperty({ example: 'v1.0', description: '동의한 정책 버전', required: false })
  @IsOptional()
  @IsString({ message: '정책 버전은 문자열이어야 합니다.' })
  @MaxLength(50, { message: '정책 버전은 최대 50자까지 입력 가능합니다.' })
  version?: string | null;

  @ApiProperty({ example: '2026-04-20', description: '동의한 정책 시행일', required: false })
  @IsOptional()
  @IsString({ message: '정책 시행일은 문자열이어야 합니다.' })
  @MaxLength(20, { message: '정책 시행일은 최대 20자까지 입력 가능합니다.' })
  effectiveDate?: string | null;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: '주문 상품 목록' })
  @IsArray({ message: '주문 상품 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ example: '홍길동', description: '수령인 이름' })
  @IsString({ message: '수령인 이름을 입력해 주세요.' })
  @IsNotEmpty({ message: '수령인 이름을 입력해 주세요.' })
  @MaxLength(100, { message: '수령인 이름은 최대 100자까지 입력 가능합니다.' })
  recipientName!: string;

  @ApiProperty({ example: '010-1234-5678', description: '수령인 연락처' })
  @IsString({ message: '수령인 연락처를 입력해 주세요.' })
  @IsNotEmpty({ message: '수령인 연락처를 입력해 주세요.' })
  @MaxLength(20, { message: '수령인 연락처는 최대 20자까지 입력 가능합니다.' })
  recipientPhone!: string;

  @ApiProperty({ example: '12345', description: '우편번호' })
  @IsString({ message: '우편번호를 입력해 주세요.' })
  @IsNotEmpty({ message: '우편번호를 입력해 주세요.' })
  @MaxLength(10, { message: '우편번호는 최대 10자까지 입력 가능합니다.' })
  zipcode!: string;

  @ApiProperty({ example: '서울특별시 강남구 테헤란로 123', description: '주소' })
  @IsString({ message: '주소를 입력해 주세요.' })
  @IsNotEmpty({ message: '주소를 입력해 주세요.' })
  @MaxLength(255, { message: '주소는 최대 255자까지 입력 가능합니다.' })
  address!: string;

  @ApiProperty({ example: '101동 101호', description: '상세 주소', required: false })
  @IsOptional()
  @IsString({ message: '상세 주소는 문자열이어야 합니다.' })
  @MaxLength(255, { message: '상세 주소는 최대 255자까지 입력 가능합니다.' })
  addressDetail?: string | null;

  @ApiProperty({ example: '부재 시 문 앞에 놓아주세요', description: '배송 메모', required: false })
  @IsOptional()
  @IsString({ message: '배송 메모는 문자열이어야 합니다.' })
  @MaxLength(500, { message: '배송 메모는 최대 500자까지 입력 가능합니다.' })
  memo?: string | null;

  @ApiProperty({ example: 'ko', enum: ['ko', 'en'], description: '주문 생성 시점 로케일', required: false })
  @IsOptional()
  @IsIn(['ko', 'en'], { message: '주문 로케일은 ko 또는 en이어야 합니다.' })
  orderLocale?: 'ko' | 'en';

  @ApiProperty({ example: 1000, description: '사용할 포인트', required: false })
  @IsOptional()
  @IsInt({ message: '포인트 사용량은 정수여야 합니다.' })
  @Min(0, { message: '포인트 사용량은 0 이상이어야 합니다.' })
  pointsUsed?: number;

  @ApiProperty({ example: 1, description: '사용할 쿠폰 ID (사용자 발급 쿠폰)', required: false })
  @IsOptional()
  @IsInt({ message: '쿠폰 ID는 정수여야 합니다.' })
  userCouponId?: number;

  @ApiProperty({ example: true, description: '바로 구매 주문이면 기존 장바구니를 보존', required: false })
  @IsOptional()
  @IsBoolean({ message: '장바구니 보존 여부는 boolean이어야 합니다.' })
  preserveCart?: boolean;

  @ApiProperty({ type: [PolicyConsentSnapshotDto], description: '결제 동의 시점 정책 버전 스냅샷', required: false })
  @IsOptional()
  @IsArray({ message: '정책 동의 목록은 배열이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => PolicyConsentSnapshotDto)
  policyConsents?: PolicyConsentSnapshotDto[];

  @ApiProperty({ example: false, description: '마케팅 수신 동의 여부', required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean({ message: '마케팅 수신 동의 여부는 boolean이어야 합니다.' })
  marketingConsent?: boolean;
}
