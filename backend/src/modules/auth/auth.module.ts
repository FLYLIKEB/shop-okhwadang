import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { TokenIssuerService } from './services/token-issuer.service';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthLoginPolicyService } from './services/auth-login-policy.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { VerificationToken } from './entities/verification-token.entity';
import { User } from '../users/entities/user.entity';
import { UserAuthentication } from '../users/entities/user-authentication.entity';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { AuthEventsModule } from './auth-events.module';
import { AUTH_CONFIG, AuthConfig } from '../../config/auth.config';
import { AuthConfigModule } from '../../config/auth-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAuthentication, PasswordResetToken, TokenBlacklist, VerificationToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthConfigModule,
    JwtModule.registerAsync({
      imports: [AuthConfigModule],
      inject: [AUTH_CONFIG],
      useFactory: (authConfig: AuthConfig) => ({
        privateKey: authConfig.jwt.privateKey,
        signOptions: {
          expiresIn: authConfig.jwt.expiresIn,
          algorithm: 'RS256',
        },
      }),
    }),
    HttpModule,
    AuditLogModule,
    AuthEventsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthService,
    TokenIssuerService,
    AuthAuditService,
    AuthLoginPolicyService,
    JwtStrategy,
    TokenBlacklistService,
  ],
  exports: [PassportModule, JwtModule, AuditLogModule, AuthEventsModule],
})
export class AuthModule {}
