# 백엔드 Cache 모듈 — REDIS_URL 연동 가이드

> **범위**: `backend/src/modules/cache/` — 기존 `CacheService`가 `REDIS_URL`을如何使用하는지 설명

---

## 1. 현재 구현 개요

`CacheService` (`backend/src/modules/cache/cache.service.ts`)는 `ioredis`를 사용하여 Redis에 연결합니다.

```typescript
// CacheService 생성자
constructor() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    this.client = new Redis(redisUrl);
    this.client.on('error', (err: Error) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
  }
}
```

### 연결 유무에 따른 동작

| 상태 | `get/set/del` 동작 |
|------|-------------------|
| `REDIS_URL` 없음 (로컬 개발) | ✅ `null` 반환 / silent fail — **서비스 중단 없음** |
| `REDIS_URL` 설정됨 | 정상 캐시 동작 |

---

## 2. 환경 변수 참조

| 변수 | 위치 | 현재 기본값 | ElastiCache용 |
|------|------|-----------|--------------|
| `REDIS_URL` | `.env.example` line 42 | `redis://:${REDIS_PASSWORD}@localhost:6380` | `redis://:<PASSWORD>@<endpoint>:6379` |
| `REDIS_PASSWORD` | `.env.example` line 4 | `__REDACTED_REDIS_PW__` | ElastiCache Auth token 또는 DSM |

> **참고**: 현재 `.env.example`의 `REDIS_URL`은 **로컬 Docker Redis** (`localhost:6380`) 기준입니다. ElastiCache 사용 시 **포트 6379**로 변경해야 합니다.

---

## 3. 캐시用途 (현재 사용처)

### 3.1 ProductsService — 상품 캐싱

**파일**: `backend/src/modules/products/products.service.ts`

`CacheService`를 사용하여 다음 데이터를 캐싱:

- 상품 목록 (카테고리/검색 결과)
- 개별 상품 상세 정보
- 상품 슬러그 기반 조회

**TTL**: 일반적으로 5~15분 (상품 변동频率에 따라 조정)

### 3.2 SettingsService — 설정 캐싱

**파일**: `backend/src/modules/settings/settings.service.ts`

앱 전체 설정값을 Redis에 캐시:

- 캐시 키: `settings:*`
- TTL: 1시간

---

## 4. 캐시 무효화 전략

### 패턴: `CacheService.delPattern()`

```typescript
// 상품 업데이트 시 관련 캐시 일괄 삭제
await this.cacheService.delPattern('products:*');
await this.cacheService.delPattern('search:*');
```

### 사용 규칙

| 상황 | 무효화 방식 |
|------|-----------|
| 상품 생성/수정/삭제 | `delPattern('products:*')` + `delPattern('search:*')` |
| 카테고리 변경 | `delPattern('products:category:*')` |
| 설정 변경 | `delPattern('settings:*')` |
| 주문 완료 | 세션/토큰 관련 캐시만 삭제 (상품 캐시 유지) |

---

## 5. ElastiCache 연결 시 .env.production 설정

```env
# ElastiCache (프로덕션)
REDIS_URL=redis://:<REDIS_PASSWORD>@okhwadang-redis.xxxxxx.aps2.cache.amazonaws.com:6379
REDIS_PASSWORD=<your-elasticache-auth-token>
```

### 로컬 개발 vs 프로덕션 구분

```typescript
// NestJS config에서 동적 URL 선택
const redisUrl = process.env.NODE_ENV === 'production'
  ? process.env.REDIS_URL                    // ElastiCache
  : `redis://:${process.env.REDIS_PASSWORD}@localhost:6380`; // Docker
```

---

## 6. 주요 캐시 키 패턴

| 패턴 | 용도 | 권장 TTL |
|------|------|---------|
| `products:list:{hash}` | 상품 목록 (필터/정렬 포함) | 5분 |
| `products:detail:{id}` | 개별 상품 | 10분 |
| `products:slug:{slug}` | 슬러그 기반 상품 | 10분 |
| `search:{query}:{page}` | 검색 결과 | 5분 |
| `settings:*` | 전체 설정 | 1시간 |
| `session:{userId}` | 사용자 세션 | 24시간 |
