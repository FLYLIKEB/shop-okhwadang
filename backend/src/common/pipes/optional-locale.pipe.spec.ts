import { BadRequestException } from '@nestjs/common';
import { OptionalLocalePipe } from './optional-locale.pipe';

describe('OptionalLocalePipe', () => {
  const pipe = new OptionalLocalePipe();

  it.each(['ko', 'en'] as const)('allows %s', (locale) => {
    expect(pipe.transform(locale)).toBe(locale);
  });

  it('allows missing locale', () => {
    expect(pipe.transform(undefined)).toBeUndefined();
    expect(pipe.transform('')).toBeUndefined();
  });

  it.each(['ja', 'zh', 'fr'])('rejects unsupported locale %s', (locale) => {
    expect(() => pipe.transform(locale)).toThrow(BadRequestException);
  });
});
