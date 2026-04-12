# S3 + CloudFront 스토리지 설정 가이드

> AWS Phase 1: S3 + CloudFront 스토리지 전환 문서
> 이슈: #374

## 개요

옥화당 자사몰의 이미지/미디어 스토리지를 EC2 로컬 스토리지에서 AWS S3 + CloudFront로 전환한다.

## 1. S3 버킷 설정

| 항목 | 값 |
|------|-----|
| 버킷 이름 | `okhwadang-assets` |
| 리전 | `ap-northeast-2` (서울) |
| 블록 공용 액세스 | **체크 해제 (CloudFront OAC만 액세스)** |
| 기본 암호화 | SSE-S3 (AES-256) |
| 버전 관리 | 활성화 |

### 버킷 정책 (OAC 전용)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::okhwadang-assets/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## 2. CloudFront 배포 설정

### 기본 설정

| 항목 | 값 |
|------|-----|
| 원본 도메인 | `okhwadang-assets.s3.ap-northeast-2.amazonaws.com` |
| 원본 액세스 제어 | **OAC (Origin Access Control)** — 새로 생성 |
| 뷰어 프로토콜 정책 | Redirect HTTP to HTTPS |
| 허용된 HTTP 메서드 | GET, HEAD, OPTIONS |
| 캐시 정책 | CachingOptimized (커스텀) |
|Harga | WAF:Basic |

### 캐시 TTL 설정

| 경로 패턴 | TTL |
|-----------|-----|
| `*.jpg`, `*.jpeg`, `*.png`, `*.webp`, `*.avif` (이미지) | 1년 (31536000초) |
| `*.js`, `*.css` (정적 자산) | 1일 (86400초) |
| 기본 (`/*`) | 1일 (86400초) |

### 이미지 최적화

- **최소 쿼리 문자열 캐싱**: `RemoveQueryStringExcluding "files"` (CloudFront 3.x)
- **압축**: Brotli 우선, gzip 폴백
- **적응형 이미지**: CloudFront Functions로 WebP 변환 (후속 Phase에서 구현)

## 3. 백엔드 환경 변수

`.env.example`에 추가:

```bash
# ─────────────────────────────────────────────
# 스토리지 (S3 + CloudFront)
# ─────────────────────────────────────────────
STORAGE_PROVIDER=s3          # s3 또는 local (기본값: local)
AWS_S3_BUCKET=okhwadang-assets
AWS_CLOUDFRONT_DOMAIN=xxxxxxxx.cloudfront.net
AWS_REGION=ap-northeast-2
# AWS_ACCESS_KEY_ID=          # EC2 IAM Role 사용 시 불필요
# AWS_SECRET_ACCESS_KEY=     # EC2 IAM Role 사용 시 불필요
```

## 4. next.config.ts 이미지 설정

Next.js `remotePatterns`에 CloudFront 도메인 추가 (이미 `*.amazonaws.com` 허용됨):

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'xxxxxxxx.cloudfront.net' },  // CloudFront 추가
      // ... 기존 패턴들
    ],
  },
};
```

## 5. EC2 IAM Role 설정 (권장)

EC2 인스턴스에 IAM Role을 할당하여 환경 변수에 AWS 자격 증명을 저장하지 않는다.

### IAM Role 생성 단계

1. **IAM Role 생성**:
   - Trusted entity: AWS service → EC2
   - Permissions: `AmazonS3FullAccess` (또는 커스텀 정책)

2. **인라인 정책 (최소 권한)**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::okhwadang-assets",
        "arn:aws:s3:::okhwadang-assets/*"
      ]
    }
  ]
}
```

3. **EC2 인스턴스에 Role 할당**:
   - EC2 Dashboard → Instances → 인스턴스 선택
   - Actions → Security → Modify IAM Role
   - 생성한 Role 선택 후 저장

4. **백엔드 코드 변경 (선택적)**:
   - AWS SDK가 자동으로 EC2 Role의 credentials를 가져옴
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 환경 변수는 비워둠

## 6. 마이그레이션: EC2 로컬 이미지 → S3 대량 업로드

기존 EC2에 저장된 이미지를 S3로 이전하는 대량 업로드 스크립트 참고용.

### AWS CLI 대량 업로드

```bash
# 로컬 디렉토리 전체를 S3로 동기화
aws s3 sync /var/www/shop-okhwadang/uploads s3://okhwadang-assets/uploads \
  --region ap-northeast-2 \
  --storage-class STANDARD \
  --cache-control "max-age=31536000" \
  --content-type "image/jpeg" \
  --exclude "*.tmp" \
  --exclude "*.lock"
```

### 이미지 캐시 무효화

전체 CloudFront 캐시 무효화 (최소限):

```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### Phase별 마이그레이션 체크리스트

- [ ] Phase 1: S3 버킷 + CloudFront 배포 생성
- [ ] Phase 1: `STORAGE_PROVIDER=s3` 환경 변수 설정
- [ ] Phase 1: `AWS_CLOUDFRONT_DOMAIN` CloudFront 도메인 설정
- [ ] Phase 2: 기존 이미지 S3 마이그레이션 스크립트 실행
- [ ] Phase 2: CloudFront 캐시 무효화
- [ ] Phase 3: EC2 로컬 스토어 비활성화

## 7. 참조 링크

- [Using origin access control with S3 bucket](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-policy-settings.html)
- [AWS CLI S3 Sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
