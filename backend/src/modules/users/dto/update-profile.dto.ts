import {
  IsOptional, IsString, MinLength, MaxLength, Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^01[0-9]-\d{3,4}-\d{4}$/, { message: '올바른 전화번호 형식이 아닙니다.' })
  phone?: string | null;
}
