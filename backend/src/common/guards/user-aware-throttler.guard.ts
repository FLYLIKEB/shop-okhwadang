import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';

/**
 * NAT/사옥/공유 프록시 환경에서 한 사용자의 burst 가 다른 사용자에게
 * 전이되지 않도록, 인증 요청은 user:{id}, 비인증 요청은 ip:{addr} 로
 * 트래커 키를 분리한다.
 *
 * APP_GUARD 순서상 ThrottlerGuard 가 JwtAuthGuard 보다 먼저 실행되므로
 * req.user 는 아직 비어있다. accessToken 쿠키가 있으면 직접 디코드해
 * 트래커 키로만 사용한다 (verify 는 JwtAuthGuard 가 담당). 토큰이
 * 위조되어도 트래커 버킷 분리는 악영향이 없고, 실제 인증은 뒤의
 * JwtAuthGuard 에서 거부된다.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const userFromReq = req?.user as { id?: number | string } | undefined;
    if (this.hasId(userFromReq?.id)) {
      return `user:${userFromReq!.id}`;
    }

    const token = this.extractAccessToken(req);
    if (token) {
      const sub = this.decodeSub(token);
      if (this.hasId(sub)) {
        return `user:${sub}`;
      }
    }

    const ip = typeof req?.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown';
    return `ip:${ip}`;
  }

  private hasId(value: unknown): value is number | string {
    return (
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.length > 0)
    );
  }

  private extractAccessToken(req: Record<string, unknown>): string | undefined {
    const cookies = req?.cookies as Record<string, string> | undefined;
    const token = cookies?.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private decodeSub(token: string): number | string | undefined {
    try {
      const payload = jwt.decode(token);
      if (!payload || typeof payload !== 'object') return undefined;
      // refresh 토큰은 tracker 버킷을 access 와 섞지 않도록 거부
      if ((payload as { tokenType?: string }).tokenType === 'refresh') return undefined;
      const sub = (payload as { sub?: unknown }).sub;
      if (typeof sub === 'number' || typeof sub === 'string') return sub;
      return undefined;
    } catch {
      return undefined;
    }
  }
}
