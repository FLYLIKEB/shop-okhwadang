import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const SUPPORTED_LOCALES = ['ko', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

@Injectable()
export class OptionalLocalePipe implements PipeTransform<unknown, SupportedLocale | undefined> {
  transform(value: unknown): SupportedLocale | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value !== 'string' || !SUPPORTED_LOCALE_SET.has(value)) {
      throw new BadRequestException(`지원하지 않는 locale입니다. (${SUPPORTED_LOCALES.join(', ')})`);
    }

    return value as SupportedLocale;
  }
}
