import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartQuantityDto {
  @ApiProperty({ example: 3, description: '변경할 수량' })
  @IsInt()
  @Min(1)
  quantity!: number;
}
