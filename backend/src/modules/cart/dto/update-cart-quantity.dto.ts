import { IsInt, Min } from 'class-validator';

export class UpdateCartQuantityDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
