# NestJS Secrets Manager Integration

## Overview

This document describes how the backend NestJS application loads secrets from AWS Secrets Manager at startup. The current implementation uses `dotenv/config` in `main.ts`. This guide shows how to add a custom secrets loader that fetches from AWS Secrets Manager.

## Current Configuration

Currently, the backend uses NestJS `TypeOrmModule.forRoot()` with environment variables loaded via `dotenv/config`:

```typescript
// backend/src/main.ts
import 'dotenv/config';
```

```typescript
// backend/src/app.module.ts
TypeOrmModule.forRoot({
  url: process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL,
  // ...
})
```

## Custom Secrets Loader Approach

### Option A: Async ConfigModule (Recommended)

Create a custom module that loads secrets at application startup using an async configuration:

**`src/modules/secrets/secrets.module.ts`**
```typescript
import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
```

**`src/modules/secrets/secrets.service.ts`**
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private readonly client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
  private secrets: Record<string, string> = {};

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Skipping Secrets Manager in non-production environment');
      return;
    }

    await this.loadSecrets();
  }

  private async loadSecrets() {
    try {
      const command = new GetSecretValueCommand({
        SecretId: 'okhwadang/production',
      });
      const response = await this.client.send(command);
      if (response.SecretString) {
        this.secrets = JSON.parse(response.SecretString);
        // Apply secrets to process.env
        Object.entries(this.secrets).forEach(([key, value]) => {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        });
        this.logger.log('Successfully loaded secrets from AWS Secrets Manager');
      }
    } catch (error) {
      this.logger.error('Failed to load secrets from AWS Secrets Manager', error);
      throw error;
    }
  }

  getSecret(key: string): string | undefined {
    return this.secrets[key];
  }
}
```

**`src/modules/secrets/secrets.module.ts`** (complete)
```typescript
import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
```

### Option B: ConfigModule Custom Loader

For use with `@nestjs/config`, create a custom configuration loader:

**`src/config/secrets.loader.ts`**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export const loadSecrets = async (): Promise<Record<string, string>> => {
  if (process.env.NODE_ENV !== 'production') {
    return {};
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
  const command = new GetSecretValueCommand({ SecretId: 'okhwadang/production' });
  const response = await client.send(command);

  if (!response.SecretString) {
    throw new Error('No secret string found in Secrets Manager');
  }

  return JSON.parse(response.SecretString);
};
```

**`src/app.module.ts`** (with ConfigModule)
```typescript
import { ConfigModule } from '@nestjs/config';
import { loadSecrets } from './config/secrets.loader';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadSecrets],
      isGlobal: true,
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

## Required Dependencies

```bash
npm install @aws-sdk/client-secrets-manager
npm install -D @types/aws-sdk__client-secrets-manager
```

Or install the SDK bundle:

```bash
npm install @aws-sdk/client-secrets-manager
```

## Environment Variables

These must still be provided via `.env` or EC2 IAM role:

```env
AWS_REGION=ap-northeast-2
NODE_ENV=production
```

## Integration Steps

1. **Create the secrets module**:
   ```bash
   mkdir -p backend/src/modules/secrets
   ```

2. **Add to `app.module.ts`**:
   ```typescript
   import { SecretsModule } from './modules/secrets/secrets.module';

   @Module({
     imports: [
       SecretsModule,  // Add before other modules that need secrets
       // ... other imports
     ],
   })
   export class AppModule {}
   ```

3. **Install AWS SDK**:
   ```bash
   cd backend && npm install @aws-sdk/client-secrets-manager
   ```

4. **Configure IAM role** on EC2 (see `SECRETS_MANAGER_SETUP.md`)

5. **Test locally** (non-production skips Secrets Manager loading)

## Precedence

Environment variables set in `.env` take precedence over Secrets Manager values. This allows local development to override production secrets when needed.

```typescript
// In SecretsService.loadSecrets()
Object.entries(this.secrets).forEach(([key, value]) => {
  if (!process.env[key]) {  // Only set if not already set
    process.env[key] = value;
  }
});
```

## Error Handling

The secrets loader should fail fast in production if secrets cannot be loaded:

```typescript
async onModuleInit() {
  if (process.env.NODE_ENV === 'production') {
    await this.loadSecrets();  // Throws if secrets unavailable
  }
}
```

For stagedrollouts, consider a fallback that logs a warning but continues:

```typescript
private async loadSecrets() {
  try {
    // ... loading logic
  } catch (error) {
    this.logger.error('Failed to load secrets - using .env fallback');
    // Allows startup to continue with .env values
  }
}
```
