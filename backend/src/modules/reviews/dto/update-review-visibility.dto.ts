import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt } from 'class-validator';

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: true, description: '노출 여부' })
  @IsBoolean()
  isVisible!: boolean;
}

export class BulkUpdateReviewVisibilityDto extends UpdateReviewVisibilityDto {
  @ApiProperty({ example: [1, 2, 3], description: '외부 리뷰 ID 목록' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids!: number[];
}
