import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LookupGuestOrderDto {
  @ApiProperty({ example: 'ORD-20260722-ABCDE', description: '주문 번호' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '주문 번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '주문 번호를 입력해 주세요.' })
  @MaxLength(50, { message: '주문 번호는 최대 50자까지 입력 가능합니다.' })
  orderNumber!: string;

  @ApiProperty({ example: 'guest@example.com', description: '주문 시 사용한 이메일' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: '이메일 형식이 올바르지 않습니다.' })
  @MaxLength(255, { message: '이메일은 최대 255자까지 입력 가능합니다.' })
  email!: string;

  @ApiPropertyOptional({ example: 'ko', enum: ['ko', 'en'], description: '로케일 (ko/en)' })
  @IsOptional()
  @IsIn(['ko', 'en'], { message: '로케일은 ko 또는 en만 지원합니다.' })
  locale?: 'ko' | 'en';
}
