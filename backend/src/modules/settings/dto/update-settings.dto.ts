import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, ValidateNested, MaxLength } from 'class-validator';
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
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto], description: '설정 목록' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings!: SettingItemDto[];
}
