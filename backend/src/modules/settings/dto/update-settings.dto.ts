import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, ValidateIf, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty({ example: 'site_title', description: '설정 키' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key!: string;

  @ApiPropertyOptional({ example: '옥화당', description: '설정 값' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  value?: string;

  @ApiPropertyOptional({ example: 'Ockhwadang', description: '영문 설정 값' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  valueEn?: string | null;

}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto], description: '설정 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings!: SettingItemDto[];
}
