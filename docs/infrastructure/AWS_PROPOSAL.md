# AWS Infrastructure Proposal — 옥화당 자사몰

> 작성일: 2026-04-09 | 상태: Draft

## 1. 현재 구성 (As-Is)

```
┌──────────┐     HTTPS      ┌──────────────┐     API Rewrite     ┌─────────────────┐
│  Client  │ ──────────────→ │   Vercel      │ ─────────────────→ │  EC2 t3.small   │
│ (Browser)│                 │  (Next.js SSR)│                    │  Ubuntu 22.04   │
└──────────┘                 └──────────────┘                    │  Nginx + PM2    │
                                                                  │  NestJS :3000   │
                                                                  └────────┬────────┘
                                                                           │
                                                                  ┌────────▼────────┐
                                                                  │ Lightsail MySQL │
                                                                  │   8.0 (managed) │
                                                                  │  7-day backup   │
                                                                  └─────────────────┘
```

| 구성요소 | 현재 상태 | 비고 |
|----------|----------|------|
| Frontend | Vercel Pro | Next.js 15 SSR |
| Backend | EC2 t3.small 1대 | PM2, Nginx, Let's Encrypt |
| Database | Lightsail MySQL | 7일 자동 백업 |
| Cache | Redis (로컬 Docker만) | **프로덕션 미적용** |
| Storage | 로컬 파일시스템 | **S3 미연결** |
| CDN | 없음 (이미지) | Vercel은 프론트만 |
| IaC | 없음 | 수동 구성 |
| Secrets | GitHub Secrets + EC2 .env | AWS Secrets Manager 미사용 |
| Monitoring | PM2 로그만 | CloudWatch 미연결 |
| Staging | 없음 | 프로덕션 + 로컬만 |

### 주요 문제점

1. **단일 장애점 (SPOF)** — EC2 1대, LB 없음, 자동 복구 없음
2. **Redis 프로덕션 누락** — 캐시/세션 스토어 미동작
3. **이미지 저장소** — EC2 로컬 디스크 (스케일 불가, 인스턴스 교체 시 유실)
4. **비밀값 관리 부재** — `.env` 파일 기반, 감사 로그 없음
5. **모니터링 부재** — 장애 감지가 10분 주기 healthcheck.yml에 의존
6. **스테이징 환경 없음** — 프로덕션 직배포 리스크

---

## 2. 목표 구성 (To-Be)

### Phase 1: 안정성 확보 (즉시)

```
┌──────────┐      ┌──────────────┐      ┌──────────────────────────────────┐
│  Client  │ ───→ │   Vercel      │ ───→ │         AWS VPC (10.0.0.0/16)   │
└──────────┘      └──────────────┘      │                                  │
                                         │  ┌─ Public Subnet ────────────┐  │
                                         │  │  EC2 t3.small (기존)       │  │
                                         │  │  Nginx + PM2 + NestJS      │  │
                                         │  │  Security Group: 443, 22   │  │
                                         │  └────────────┬───────────────┘  │
                                         │               │                  │
                                         │  ┌─ Private Subnet ──────────┐  │
                                         │  │  Lightsail MySQL (기존)    │  │
                                         │  │  ElastiCache Redis t3.micro│  │
                                         │  │  S3 Bucket (product-images)│  │
                                         │  └────────────────────────────┘  │
                                         └──────────────────────────────────┘
```

**변경 사항:**

| 항목 | 변경 내용 | 예상 월 비용 |
|------|----------|------------|
| VPC | 기본 VPC에 서브넷 정리, Security Group 강화 | 무료 |
| ElastiCache | Redis t3.micro (단일 노드) | ~$13/월 |
| S3 | `okhwadang-product-images` 버킷 | ~$1/월 (10GB 기준) |
| CloudFront | S3 앞단 CDN (이미지 배포) | ~$1/월 (10GB 전송) |
| Secrets Manager | JWT_SECRET, DB 비밀번호 등 | ~$1/월 (5개 시크릿) |
| CloudWatch | 로그 + 기본 알람 (CPU, 메모리) | ~$3/월 |
| **Phase 1 추가 비용** | | **~$19/월** |

### Phase 2: 스케일업 (트래픽 증가 시)

```
┌──────────┐      ┌──────────────┐      ┌────────────────────────────────────────┐
│  Client  │ ───→ │   Vercel      │ ───→ │              AWS VPC                   │
└──────────┘      └──────────────┘      │                                        │
                                         │  ┌─ Public Subnet ──────────────────┐  │
                                         │  │        ALB (Application LB)       │  │
                                         │  │         ┌──────┴──────┐           │  │
                                         │  │     EC2 (a)       EC2 (b)         │  │
                                         │  │     t3.small      t3.small        │  │
                                         │  │     (ASG min:1, max:3)            │  │
                                         │  └──────────────────────────────────┘  │
                                         │                                        │
                                         │  ┌─ Private Subnet ────────────────┐  │
                                         │  │  RDS MySQL (Lightsail→RDS 이관)  │  │
                                         │  │  ElastiCache Redis (Multi-AZ)    │  │
                                         │  │  S3 + CloudFront                 │  │
                                         │  └──────────────────────────────────┘  │
                                         └────────────────────────────────────────┘
```

| 항목 | 변경 내용 | 예상 월 비용 |
|------|----------|------------|
| ALB | Application Load Balancer | ~$18/월 |
| ASG | Auto Scaling Group (min:1, max:3) | EC2 비용 비례 |
| RDS | Lightsail → RDS db.t3.micro (Multi-AZ 옵션) | ~$15/월 (Single-AZ) |
| ACM | SSL 인증서 (Let's Encrypt → ACM 무료) | 무료 |
| ElastiCache | Multi-AZ 업그레이드 | ~$26/월 |
| **Phase 2 추가 비용** | | **~$60/월 (Phase 1 포함)** |

### Phase 3: 운영 성숙 (장기)

| 항목 | 내용 |
|------|------|
| Terraform IaC | 전체 인프라 코드화, `terraform plan` 기반 변경 관리 |
| Staging 환경 | VPC 복제 (소규모), PR 머지 전 스테이징 배포 확인 |
| CloudWatch Dashboard | API 응답시간, 에러율, DB 커넥션 수 실시간 모니터링 |
| Sentry | 프론트엔드 + 백엔드 에러 트래킹 |
| WAF | CloudFront/ALB 앞단 웹 방화벽 (SQL Injection, XSS 차단) |
| Backup | RDS 자동 스냅샷 35일 + S3 Cross-Region Replication |

---

## 3. Phase 1 상세 실행 계획

### 3.1 ElastiCache Redis 구성

```
인스턴스: cache.t3.micro
엔진: Redis 7.x
노드 수: 1 (Single-AZ)
보안: VPC 내부만 접근, Security Group 6379 포트 EC2에서만 허용
```

**백엔드 변경:**
```typescript
// backend/.env.production
REDIS_URL=redis://<elasticache-endpoint>:6379

// 기존 코드 변경 불필요 — ioredis가 URL 기반 연결
```

### 3.2 S3 + CloudFront 구성

```
버킷: okhwadang-product-images
리전: ap-northeast-2 (서울)
ACL: private (CloudFront OAI로만 접근)
CORS: FRONTEND_URL만 허용
수명주기: 원본 보관 무기한, 썸네일 90일
```

**백엔드 변경:**
```typescript
// backend/.env.production
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=okhwadang-product-images
AWS_S3_REGION=ap-northeast-2
AWS_CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net

// IAM Role 기반 인증 (EC2 Instance Profile) — Access Key 불필요
```

### 3.3 Secrets Manager 마이그레이션

| 시크릿 이름 | 현재 위치 | 이관 대상 |
|------------|----------|----------|
| `okhwadang/db` | EC2 .env | `{ host, port, username, password, database }` |
| `okhwadang/jwt` | GitHub Secrets | `{ secret, expiresIn, refreshExpiresIn }` |
| `okhwadang/oauth/kakao` | EC2 .env | `{ clientId, clientSecret }` |
| `okhwadang/oauth/google` | EC2 .env | `{ clientId, clientSecret }` |
| `okhwadang/redis` | EC2 .env | `{ url, password }` |

**백엔드 변경:**
```typescript
// src/config/secrets.ts — AWS SDK v3로 시크릿 로드
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// 앱 부트스트랩 시 1회 로드 → ConfigModule에 주입
// IAM Role 기반 인증 (EC2 Instance Profile)
```

### 3.4 CloudWatch 로그 + 알람

```
로그 그룹: /okhwadang/backend
보존 기간: 30일
알람:
  - CPU > 80% (5분 지속) → SNS 알림
  - 메모리 > 85% → SNS 알림
  - API 5xx 에러 > 10/분 → SNS 알림
  - Healthcheck 실패 2회 연속 → SNS 알림
```

**설치:**
```bash
# EC2에 CloudWatch Agent 설치
sudo yum install -y amazon-cloudwatch-agent
# PM2 로그를 CloudWatch로 스트리밍
```

### 3.5 Security Group 정리

| SG 이름 | 인바운드 규칙 |
|---------|-------------|
| `sg-ec2-backend` | 443 (0.0.0.0/0), 22 (관리자 IP만) |
| `sg-mysql` | 3306 (`sg-ec2-backend`에서만) |
| `sg-redis` | 6379 (`sg-ec2-backend`에서만) |

---

## 4. 비용 요약

| 구성요소 | 현재 월 비용 | Phase 1 | Phase 2 |
|----------|------------|---------|---------|
| Vercel Pro | $20 | $20 | $20 |
| EC2 t3.small | ~$15 | ~$15 | ~$30 (x2) |
| Lightsail MySQL | ~$15 | ~$15 | ~$15 (→ RDS) |
| ElastiCache | $0 | ~$13 | ~$26 |
| S3 + CloudFront | $0 | ~$2 | ~$5 |
| Secrets Manager | $0 | ~$1 | ~$1 |
| CloudWatch | $0 | ~$3 | ~$5 |
| ALB | $0 | $0 | ~$18 |
| **합계** | **~$50** | **~$69** | **~$120** |

---

## 5. 우선순위 및 일정 제안

| 순서 | 작업 | 영향도 | 난이도 | 비고 |
|------|------|--------|--------|------|
| 1 | Security Group 정리 | 높음 | 낮음 | 즉시 적용 가능, 무료 |
| 2 | S3 + CloudFront | 높음 | 중간 | 이미지 유실 방지, STORAGE_PROVIDER=s3 전환 |
| 3 | ElastiCache Redis | 중간 | 낮음 | REDIS_URL 변경만으로 완료 |
| 4 | CloudWatch 로그 | 중간 | 낮음 | Agent 설치 + PM2 로그 연동 |
| 5 | Secrets Manager | 중간 | 중간 | 백엔드 ConfigModule 수정 필요 |
| 6 | ALB + ASG | 높음 | 높음 | Phase 2, 트래픽 증가 시 |
| 7 | Lightsail → RDS | 중간 | 높음 | 마이그레이션 다운타임 계획 필요 |
| 8 | Terraform IaC | 높음 | 높음 | Phase 3, 전체 인프라 코드화 |

---

## 6. 참고 — 현재 배포 파이프라인 (변경 없음)

```
PR → CI (lint + test) → Merge to main → GitHub Actions deploy.yml
                                              │
                                              ▼
                                    SSH into EC2
                                    git pull origin main
                                    npm ci --omit=dev
                                    npm run build
                                    npm run migration:run:prod
                                    pm2 reload commerce --update-env
```

Phase 2에서 ALB + ASG 도입 시 → CodeDeploy 또는 ECR + ECS Fargate로 전환 검토.
