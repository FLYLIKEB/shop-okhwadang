import { Module } from '@nestjs/common';
import { authConfigProvider } from './auth.config';

@Module({
  providers: [authConfigProvider],
  exports: [authConfigProvider],
})
export class AuthConfigModule {}
