import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty({ example: 'site_title', description: '설정 키' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: '옥화당', description: '설정 값' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  value!: string;

  @ApiPropertyOptional({ example: 'Okhwadang', description: '영문 설정 값' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  valueEn?: string;

  @ApiPropertyOptional({ example: '玉花堂', description: '일본어 설정 값' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  valueJa?: string;

  @ApiPropertyOptional({ example: '玉花堂', description: '중국어 설정 값' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  valueZh?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto], description: '설정 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings!: SettingItemDto[];
}
