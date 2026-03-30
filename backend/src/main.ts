import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

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
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

bootstrap();
