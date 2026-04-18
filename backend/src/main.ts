import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { assertEnv } from './config/env-validator';

// 프로덕션 환경에서 필수 env 키 사전 검증 — 누락 시 명확한 에러 메시지와 함께 종료
assertEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // TypeORM returns bigint columns as strings; convert numeric strings to numbers in JSON responses
  const httpAdapter = app.getHttpAdapter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (httpAdapter.getInstance() as any).set('json replacer', (_key: string, value: unknown) => {
    if (typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
      return Number(value);
    }
    return value;
  });

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  app.enableCors({
    origin: [frontendUrl, ...(process.env.FRONTEND_URLS?.split(',') || [])],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) =>
          Object.values(e.constraints ?? {}),
        );
        return new BadRequestException(messages.join(', '));
      },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('옥화당 API')
      .setDescription('옥화당 자사몰 백엔드 API 문서입니다.')
      .setVersion('1.0')
      .addCookieAuth('accessToken', { type: 'apiKey', in: 'cookie' }, 'accessToken')
      .addCookieAuth('refreshToken', { type: 'apiKey', in: 'cookie' }, 'refreshToken')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`);
}

bootstrap();
