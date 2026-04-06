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
import { User } from '../users/entities/user.entity';
import { UserAuthentication } from '../users/entities/user-authentication.entity';

function getJwtPrivateKey(): string {
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY;
  }
  const keyPath = path.resolve(process.cwd(), 'keys', 'jwt-private.pem');
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf-8');
  }
  throw new Error('JWT_PRIVATE_KEY environment variable or keys/jwt-private.pem file is required');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAuthentication]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: getJwtPrivateKey(),
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as ms.StringValue,
        algorithm: 'RS256',
      },
    }),
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OAuthService, JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
