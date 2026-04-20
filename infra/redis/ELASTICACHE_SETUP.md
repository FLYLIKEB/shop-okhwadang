# AWS ElastiCache Redis — Phase 1 프로덕션 도입 가이드

> **목적**: ECS/EC2와 같은 VPC 내 ElastiCache Redis(Redis 7)를 프로덕션 캐시로 도입하여 로컬 Redis 의존성을 제거

---

## 1. 인스턴스 사양

| 항목 | 값 |
|------|-----|
| **인스턴스 타입** | `cache.t3.micro` (테스트/소규모 프로덕션용) |
| **Redis 버전** | 7.x |
| **포트** | `6379` (기본) |
| **노드 타입** | Single-node (필요 시 Replica Node 추가) |
| **파라미터 그룹** | `default.redis7.x` (또는 커스텀 `okhwadang-redis-7`) |
| **암호화** | TLS in-transit (추천), at-rest (AWS 관리 키) |
| **자동 백업** | Enabled, 유지 기간 7일 |

---

## 2. VPC / 서브넷 구성

- **VPC**: ECS/EC2와 **동일 VPC** 사용
- **서브넷**: 최소 2개 가용 영역(AZ)에 서브넷 배포
  - 예: `10.0.1.0/24` (AZ-a), `10.0.2.0/24` (AZ-c)
- **퍼블릭 액세스**: ❌ 비활성화 (VPC 내에서만 접근)
- **NAT Gateway**: EC2가 NAT를 통해 ElastiCache에 접근할 수 있도록 구성

---

## 3. 보안 그룹 (필수)

ElastiCache용 보안 그룹을 생성하고 **인바운드 규칙**을 추가:

| 방향 | 소스 | 프로토콜 | 포트 | 설명 |
|------|------|----------|------|------|
| **인바운드** | EC2 보안 그룹 (또는 CIDR) | TCP | **6379** | Redis 접근 허용 |
| **인바운드** | `10.0.0.0/16` (VPC CIDR) | TCP | 6379 | VPC 내부 접근 |

> ⚠️ **주의**: Redis 포트(6379)를 공개하지 마십시오.

```bash
# AWS CLI로 생성 예시
aws elasticache create-security-group \
  --group-name okhwadang-redis-sg \
  --description "ElastiCache Redis security group for okhwadang"

aws ec2 authorize-security-group-ingress \
  --group-name okhwadang-redis-sg \
  --protocol tcp \
  --port 6379 \
  --source-group <ec2-security-group-id>
```

---

## 4. 연결 문자열 (Connection String)

ElastiCache 클러스터 엔드포인트를 확인:

```bash
aws elasticache describe-replication-groups \
  --replication-group-id okhwadang-redis
```

엔드포인트 예시: `okhwadang-redis.xxxxxx.aps2.cache.amazonaws.com`

**`.env.production` 설정:**

```env
REDIS_URL=redis://:<REDIS_PASSWORD>@okhwadang-redis.xxxxxx.aps2.cache.amazonaws.com:6379
```

> **참고**: ElastiCache 기본 엔드포인트는 **writer 노드**입니다. 읽기 분산이 필요하면 Reader 엔드포인트를 사용하거나 Replica Node를 추가하세요.

---

## 5. 파라미터 그룹 커스터마이징 (선택)

```bash
aws elasticache create-cache-parameter-group \
  --cache-parameter-group-name okhwadang-redis-7 \
  --cache-family redis7 \
  --description "Custom parameter group for okhwadang"

aws elasticache modify-cache-parameter-group \
  --cache-parameter-group-name okhwadang-redis-7 \
  --parameter-name-values \
    ParameterName=maxmemory-policy,ParameterValue=allkeys-lru
```

---

## 6. 기존 로컬 Redis에서 마이그레이션

1. **ElastiCache 프로비저닝 완료** 후 엔드포인트 확인
2. **REDIS_URL 변경** — `.env.production`에 ElastiCache 엔드포인트 설정
3. **TTL 기반 자연스러운 캐시 교체** — 기존 키는 TTL 만료 시 삭제
4. **소급 삭제** (필요 시): `redis-cli`로 `FLUSHDB` 실행 (⚠️ 프로덕션环境影响)
5. **모니터링**: CloudWatch `DatabaseMemoryDatabaseBytesUsageForCache` 지표 확인

---

## 7. CloudWatch 대시보드 지표

| 지표 | 설명 | 임계값 (예시) |
|------|------|--------------|
| `CPUUtilization` | Redis CPU 사용률 | > 80% 알람 |
| `DatabaseMemoryUsagePercentage` | 메모리 사용률 | > 75% 알람 |
| `CacheHitRate` | 캐시 히트율 | < 80% 알람 |
| `CurrConnections` | 현재 연결 수 | > 500 알람 |
| `ReplicationLag` | 복제 지연 (Replica 사용 시) | > 30초 알람 |

---

## 8. 장애 대응 체크리스트

- [ ] ElastiCache 이벤트 알림 설정 (SNS 토픽 구독)
- [ ] Cache Engine Version 업그레이드 일정 관리
- [ ] 스냅샷 백업에서 복원 테스트 (Quarterly)
- [ ] Connection timeout 설정 (`connectTimeout=5s`, `retryDelayMax=30s`)

---

## 9. 비용 최적화 (Phase 2 예정)

- **Reserved Node**: 1년 약정으로 ~60% 절감
- **Auto Scaling**: 메모리 사용량 기반 노드 스케일링 (ElastiCache Serverless 또는 Auto Scaling 그룹)
- **Global Datastore**: 멀티 리전 재해 복구 (Phase 3)
