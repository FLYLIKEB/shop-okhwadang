# NestJS Redis Client — ioredis 통합 가이드

> **범위**: NestJS 프로젝트에 `ioredis` 기반 Redis 클라이언트를 통합하는 표준 패턴

---

## 1. 기존 CacheModule vs NestJS CacheModule

| 방식 | 장점 | 단점 |
|------|------|------|
| **기존 `CacheService` (ioredis 직접 사용)** | 커스터마이징 자유도 높음, 직접 `get/set/del` 호출 | 직접 연결 관리 필요 |
| **NestJS `@nestjs/cache-manager`** |生命周期 관리 자동, 추상화 | 커스터마이징 제한적 |

> **현재 프로젝트**: `CacheService`가 직접 `ioredis`를 사용하므로 **추가 설치 불필요**. 아래는 `CacheService`를 보강하거나 대체할 때 참고.

---

## 2. 기존 CacheService 아키텍처

```
AppModule
  └── CacheModule (Global)
        └── CacheService (ioredis client)
              ├── get<T>(key: string): Promise<T | null>
              ├── set(key: string, value: unknown, ttlSeconds: number): Promise<void>
              ├── del(key: string): Promise<void>
              └── delPattern(pattern: string): Promise<void>
```

모든 모듈에서 `@Inject(CacheService)` 없이도 접근 가능 (Global 모듈).

---

## 3. ElastiCache로 전환 시 체크리스트

### 3.1 환경 변수

```env
# .env.production
REDIS_URL=redis://:<REDIS_PASSWORD>@<elasticache-endpoint>:6379
```

### 3.2 연결 옵션 (ElastiCache 권장)

```typescript
// CacheService constructor에 추가 옵션
this.client = new Redis(redisUrl, {
  connectTimeout: 5000,      // 5s connection timeout
  retryStrategy: (times) => {
    if (times > 3) return null; // 3회 재시도 후 실패
    return Math.min(times * 200, 30000);
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});
```

### 3.3 TLS 연결 (ElastiCache in-transit encryption)

```typescript
import Redis from 'ioredis';
import * as fs from 'fs';

// ElastiCache TLS 연결
const redisUrl = process.env.REDIS_URL!;
this.client = new Redis(redisUrl, {
  tls: {
    ca: fs.readFileSync('/path/to/amazon-rds-ca-bundle.pem'),
  },
});
```

---

## 4. Cluster 모드 (Phase 2, 필요 시)

```typescript
import { RedisCluster } from 'ioredis';

const cluster = new RedisCluster([
  { host: 'node1.elasticache.com', port: 6379 },
  { host: 'node2.elasticache.com', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    tls: {},
  },
});
```

---

## 5. 연결 상태 모니터링

```typescript
// CacheService에 추가
this.client.on('connect', () => {
  this.logger.log('Redis connected');
});

this.client.on('error', (err: Error) => {
  this.logger.error(`Redis error: ${err.message}`);
});

this.client.on('close', () => {
  this.logger.warn('Redis connection closed');
});
```

---

## 6. 헬스 체크 통합

`CacheService`에 헬스 체크 메서드 추가:

```typescript
async ping(): Promise<boolean> {
  if (!this.client) return false;
  try {
    const result = await this.client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
```

NestJS HealthModule에 연동:

```typescript
// health.module.ts
{
  provide: 'redis',
  useValue: cacheService,
  healthIndicator: async (service: CacheService) => ({
    redis: { status: await service.ping() ? 'up' : 'down' },
  }),
}
```

---

## 7. 설치 (새로 시작하는 경우)

```bash
cd backend
npm install ioredis
npm install -D @types/ioredis
```

```typescript
// src/modules/cache/cache.module.ts
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

---

## 8. Phase 2에서 고려할 점

- ** eviction policy**: `maxmemory-policy allkeys-lru` (Memcached 백틱 기반)
- **복제**: Reader 엔드포인트로 읽기 분산
- **Pub/Sub**: 세션 브로드캐스트 / 실시간 알림 용도
- **Sentinel/Cluster**: 고가可用성 (HA) 구성
