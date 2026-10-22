import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @ApiProperty() @IsString() @MaxLength(255) subject!: string;
  @ApiProperty() @IsString() @MaxLength(100000) html!: string;
  @ApiProperty() @IsString() @MaxLength(10000) text!: string;
  @ApiProperty() @IsString() @MaxLength(100) templateId!: string;
}
