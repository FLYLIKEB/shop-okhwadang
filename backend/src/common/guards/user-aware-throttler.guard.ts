import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * NAT/사옥/프록시처럼 다수 사용자가 같은 IP 를 공유하는 환경에서
 * 한 사용자의 burst 가 다른 사용자에게 영향을 주지 않도록
 * 인증된 요청은 user:{id}, 비인증 요청은 ip:{addr} 로 트래커 키를 분리한다.
 */
@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req?.user as { id?: number | string } | undefined;
    const userId = user?.id;
    if (userId !== undefined && userId !== null && `${userId}`.length > 0) {
      return `user:${userId}`;
    }
    const ip = typeof req?.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown';
    return `ip:${ip}`;
  }
}
