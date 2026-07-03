import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateReviewDto {
  @ApiProperty({ example: '정말 좋아요', description: '번역할 리뷰 원문' })
  @IsString({ message: '번역할 리뷰 원문은 문자열이어야 합니다.' })
  @MinLength(1, { message: '번역할 리뷰 원문이 필요합니다.' })
  @MaxLength(2000, { message: '리뷰 번역은 2000자 이하만 지원합니다.' })
  text!: string;

  @ApiProperty({ example: 'ko', enum: ['ko', 'en'], description: '원문 언어' })
  @IsIn(['ko', 'en'], { message: '원문 언어는 ko 또는 en이어야 합니다.' })
  sourceLocale!: 'ko' | 'en';

  @ApiProperty({ example: 'en', enum: ['ko', 'en'], description: '번역 대상 언어' })
  @IsIn(['ko', 'en'], { message: '번역 대상 언어는 ko 또는 en이어야 합니다.' })
  targetLocale!: 'ko' | 'en';
}
