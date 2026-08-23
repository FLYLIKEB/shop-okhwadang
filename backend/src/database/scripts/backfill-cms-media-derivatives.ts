import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { CmsMediaBackfillService } from '../../modules/upload/cms-media-backfill.service';

interface CliOptions {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (Number.isInteger(parsed) && parsed >= 0) {
        options.limit = parsed;
      }
    }
  }
  return options;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('CmsMediaDerivativeBackfill');
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(['log', 'warn', 'error']);

  try {
    const service = app.get(CmsMediaBackfillService);
    const result = await service.backfill(options);
    logger.log(JSON.stringify(result));
    if (result.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void bootstrap().catch((err: unknown) => {
  const logger = new Logger('CmsMediaDerivativeBackfill');
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
