import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateBy, ValidateIf, isURL } from 'class-validator';

const SAFE_POPUP_URL = {
  name: 'safePopupUrl',
  validator: {
    validate: (value: unknown) => typeof value === 'string' &&
      !/[\\\s\u0000-\u001f\u007f]/.test(value) &&
      (/^\/(?!\/)/.test(value) || isURL(value, { protocols: ['http', 'https'], require_protocol: true, require_tld: false })),
    defaultMessage: () => '올바른 HTTP(S) 주소 또는 사이트 내부 경로를 입력해 주세요.',
  },
};

export class CreatePopupDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2048)
  @ValidateBy(SAFE_POPUP_URL)
  imageUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @ValidateBy(SAFE_POPUP_URL)
  linkUrl?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  startsAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  endsAt?: string | null;
}

export class UpdatePopupDto extends PartialType(CreatePopupDto, { skipNullProperties: false }) {}
