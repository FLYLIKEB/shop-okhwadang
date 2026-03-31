import { IsString, IsOptional } from 'class-validator';

export class NoticeQueryDto {
  @IsString()
  @IsOptional()
  locale?: string;
}
