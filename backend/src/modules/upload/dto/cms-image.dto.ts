import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUrl } from 'class-validator';
import { CMS_MEDIA_KINDS, CmsMediaKind } from '../cms-media.constants';

export class CmsImageImportDto {
  @ApiProperty({ example: 'https://cdn.example.com/hero.jpg' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @ApiProperty({ enum: CMS_MEDIA_KINDS, example: 'hero' })
  @IsIn(CMS_MEDIA_KINDS)
  kind!: CmsMediaKind;
}

export class CmsImageUploadQueryDto {
  @ApiProperty({ enum: CMS_MEDIA_KINDS, example: 'hero' })
  @IsString()
  @IsIn(CMS_MEDIA_KINDS)
  kind!: CmsMediaKind;
}
