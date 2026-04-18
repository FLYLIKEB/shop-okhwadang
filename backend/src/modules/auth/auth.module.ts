import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import * as fs from 'fs';
import * as path from 'path';
import type ms from 'ms';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User } from '../users/entities/user.entity';
import { UserAuthentication } from '../users/entities/user-authentication.entity';
import { AuditLogModule } from '../audit-logs/audit-log.module';

function getJwtPrivateKey(): string {
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY;
  }
  if (process.env.JWT_PRIVATE_KEY_FILE && fs.existsSync(process.env.JWT_PRIVATE_KEY_FILE)) {
    return fs.readFileSync(process.env.JWT_PRIVATE_KEY_FILE, 'utf-8');
  }
  const possiblePaths = [
    path.resolve(process.cwd(), 'keys', 'jwt-private.pem'),
    path.resolve(process.cwd(), '..', 'keys', 'jwt-private.pem'),
    path.resolve(__dirname, '..', '..', 'keys', 'jwt-private.pem'),
    path.resolve(__dirname, '..', '..', '..', 'keys', 'jwt-private.pem'),
  ];
  for (const keyPath of possiblePaths) {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath, 'utf-8');
    }
  }
  throw new Error('JWT_PRIVATE_KEY environment variable or keys/jwt-private.pem file is required');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAuthentication, PasswordResetToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: getJwtPrivateKey(),
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as ms.StringValue,
        algorithm: 'RS256',
      },
    }),
    HttpModule,
    AuditLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OAuthService, JwtStrategy],
  exports: [PassportModule, JwtModule, AuditLogModule],
})
export class AuthModule {}
