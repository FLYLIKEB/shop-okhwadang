import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min } from 'class-validator';

export class UpdatePageBlockDto {
  @ApiProperty({ example: 'hero', description: '블록 타입', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: { title: 'Updated', subtitle: 'content' }, description: '블록 콘텐츠', required: false })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiProperty({ example: 1, description: '정렬 순서', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiProperty({ example: true, description: '노출 여부', required: false })
  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;
}
