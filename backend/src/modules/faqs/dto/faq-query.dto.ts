import { IsString, IsOptional } from 'class-validator';

export class FaqQueryDto {
  @IsString()
  @IsOptional()
  category?: string;
}
