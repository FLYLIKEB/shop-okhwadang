import { IsInt, IsOptional, IsString, Max, Min, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  productId!: number;

  @IsInt()
  orderItemId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];
}
