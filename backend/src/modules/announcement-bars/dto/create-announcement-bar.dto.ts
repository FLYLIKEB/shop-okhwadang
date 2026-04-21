import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAnnouncementBarDto {
  @ApiProperty({ example: '아직 작업중인 쇼핑몰이며, 모든 것들은 더미 데이터입니다' })
  @IsString()
  @MaxLength(255)
  message!: string;

  @ApiProperty({ example: 'This shop is still under construction. All data shown is for demo purposes only.', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  message_en?: string | null;

  @ApiProperty({ example: '/products', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  href?: string | null;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
