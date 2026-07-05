import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminReviewTargetDto {
  @ApiProperty({ example: 1, description: '리뷰 ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 'naver-smartstore', description: '리뷰 출처', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: true, description: '노출 여부' })
  @IsBoolean()
  isVisible!: boolean;

  @ApiProperty({ example: 'naver-smartstore', description: '리뷰 출처', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

export class BulkUpdateReviewVisibilityDto extends UpdateReviewVisibilityDto {
  @ApiProperty({ example: [1, 2, 3], description: '외부 리뷰 ID 목록', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids?: number[];

  @ApiProperty({ type: [AdminReviewTargetDto], description: '출처를 포함한 리뷰 목록', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AdminReviewTargetDto)
  items?: AdminReviewTargetDto[];
}
