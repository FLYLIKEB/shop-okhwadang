import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min } from 'class-validator';

export class CreatePageBlockDto {
  @ApiProperty({ example: 'hero', description: '블록 타입' })
  @IsString()
  type!: string;

  @ApiProperty({ example: { title: 'Welcome', subtitle: 'to our store' }, description: '블록 콘텐츠' })
  @IsObject()
  content!: Record<string, unknown>;

  @ApiProperty({ example: 0, description: '정렬 순서', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiProperty({ example: true, description: '노출 여부', required: false })
  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;
}
