import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../modules/auth/dto/login.dto';
import { RegisterDto } from '../modules/auth/dto/register.dto';

/**
 * ValidationPipe exceptionFactory: 배열 메시지를 단일 한국어 문자열로 변환
 */
function buildPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      return new BadRequestException(messages.join(', '));
    },
  });
}

describe('ValidationPipe exceptionFactory', () => {
  it('단일 문자열 메시지를 반환해야 한다', async () => {
    const pipe = buildPipe();
    // pipe.transform triggers validation
    await expect(
      pipe.transform({}, { type: 'body', metatype: LoginDto }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.any(String),
      }),
    });
  });

  it('반환된 message가 배열이 아닌 문자열이어야 한다', async () => {
    const pipe = buildPipe();
    let caughtMessage: unknown;
    try {
      await pipe.transform({}, { type: 'body', metatype: LoginDto });
    } catch (err) {
      if (err instanceof BadRequestException) {
        caughtMessage = (err.getResponse() as { message: unknown }).message;
      }
    }
    expect(typeof caughtMessage).toBe('string');
  });
});

describe('LoginDto 한국어 메시지', () => {
  it('이메일 형식 오류 시 한국어 메시지를 반환해야 한다', async () => {
    const dto = plainToInstance(LoginDto, { email: 'not-an-email', password: '1234' });
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages.some((m) => /이메일|email/i.test(m))).toBe(true);
    // must contain Korean
    expect(messages.some((m) => /[가-힣]/.test(m))).toBe(true);
  });
});

describe('RegisterDto 한국어 메시지', () => {
  it('비밀번호 최소 길이 미달 시 한국어 메시지를 반환해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'test@test.com',
      password: '123',
      name: '홍길동',
    });
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages.some((m) => /[가-힣]/.test(m))).toBe(true);
  });

  it('이름 누락 시 한국어 메시지를 반환해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'test@test.com',
      password: 'password123',
      name: '',
    });
    const errors = await validate(dto);
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    expect(messages.some((m) => /[가-힣]/.test(m))).toBe(true);
  });
});
