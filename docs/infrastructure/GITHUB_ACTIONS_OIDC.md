# GitHub Actions OIDC + SSM 배포 가이드 (2026-04-12)

> **SSH 키 없이 GitHub Actions로 EC2에 안전하게 배포**
> **OIDC (OpenID Connect) + AWS SSM 사용**

---

## 민감정보 관리

**실제 값은 다음에서 확인:**
- 로컬 개발: `backend/.env`
- EC2 서버: `/app/shop-okhwadang/backend/.env.production`

**문서에서는 `backend/.env.example`의 변수명을 참조합니다.**

---

## 개요

기존 SSH 키 기반 배포에서 **OIDC + SSM(Session Manager)** 방식으로 전환:

| 방식 | Credentials | 보안 |
|------|------------|------|
| 기존 (SSH) | SSH 키를 GitHub Secrets에 저장 | ⭐⭐⭐⭐ |
| **새로운 방식 (OIDC + SSM)** | 장기 키 없음, 임시 Credentials | ⭐⭐⭐⭐⭐ |

---

## 아키텍처

```
GitHub Actions
    │
    ├── OIDC Identity Provider (GitHub 신뢰)
    │
    ├── STS AssumeRoleWithWebIdentity
    │       (GitHub repo만 허용: FLYLIKEB/shop-okhwadang)
    │
    └── AWS IAM Role (GithubActionsEC2DeployRole)
            │
            ├── S3 접근 (OkhwadangS3Policy)
            │
            └── SSM Session Manager
                    │
                    └── EC2 명령어 실행
```

---

## 리소스 확인

```bash
# IAM Role ARN
aws iam get-role --role-name GithubActionsEC2DeployRole \
    --query 'Role.Arn' --output text

# Instance Profile
aws ec2 describe-iam-instance-profile-associations \
    --filters "InstanceId=i-0af729245abbb06f2"
```

---

## GitHub Secrets 설정

**필요한 Secrets (단 1개):**

| Secret | 설명 |
|--------|------|
| `EC2_HOST` | Health check용 (예: `3.38.168.41`) |

**삭제 가능한 Secrets:**
- `EC2_USER` ❌ (SSM이 대신 처리)
- `SSH_PRIVATE_KEY` ❌ (OIDC가 대신 처리)

---

## deploy.yml 설정

자세한 파일: `.github/workflows/deploy.yml`

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::618647024184:role/GithubActionsEC2DeployRole
          role-session-name: github-actions-deploy
          aws-region: ap-northeast-2

      - name: Deploy to EC2 via SSM
        run: |
          aws ssm send-command \
            --instance-ids i-0af729245abbb06f2 \
            --document-name AWS-RunShellScript \
            --parameters commands=[
              "cd /app/shop-okhwadang/backend",
              "git pull origin main",
              "npm ci --omit=dev",
              "npm run build",
              "npm run migration:run:prod",
              "pm2 restart commerce",
              "pm2 save"
            ]

      - name: Smoke test
        run: |
          sleep 20
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://${{ secrets.EC2_HOST }}:3000/api/health)
          if [ "$STATUS" != "200" ]; then
            echo "Smoke test failed! HTTP status: $STATUS"
            exit 1
          fi
```

---

## IAM Role 신뢰 정책

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::618647024184:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:FLYLIKEB/shop-okhwadang:*"
      }
    }
  }]
}
```

---

## OIDC 설정 명령어 (복구용)

이미 완료됨. 복구가 필요할 때 실행:

```bash
# 1. OIDC Provider 생성
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938FD4D7B8F3B8AF3B8AF4D5D4F3F8D7B8F3B8A \
    --region ap-northeast-2

# 2. IAM Role 생성 (GitHub 신뢰)
aws iam create-role \
    --role-name GithubActionsEC2DeployRole \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::618647024184:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:FLYLIKEB/shop-okhwadang:*"
          }
        }
      }]
    }' \
    --region ap-northeast-2

# 3. SSM + S3 Policy 연결
aws iam attach-role-policy \
    --role-name GithubActionsEC2DeployRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore \
    --region ap-northeast-2

aws iam attach-role-policy \
    --role-name GithubActionsEC2DeployRole \
    --policy-arn arn:aws:iam::618647024184:policy/OkhwadangS3Policy \
    --region ap-northeast-2

# 4. Instance Profile 생성
aws iam create-instance-profile \
    --instance-profile-name SSMSessionProfile \
    --region ap-northeast-2

aws iam add-role-to-instance-profile \
    --role-name GithubActionsEC2DeployRole \
    --instance-profile-name SSMSessionProfile \
    --region ap-northeast-2

# 5. EC2에 Instance Profile 연결
aws ec2 replace-iam-instance-profile-association \
    --association-id iip-assoc-0dcec494412875191 \
    --iam-instance-profile Name=SSMSessionProfile \
    --region ap-northeast-2
```

---

## EC2에 .env.production 생성

자세한 내용은 [`EC2_INITIAL_SETUP.md`](./EC2_INITIAL_SETUP.md)를 참조하세요.

```bash
ssh -i ~/okhwadang-ec2-key.pem ec2-user@3.38.168.41

# .env.production 생성 (실제 값은 backend/.env.example 참조)
sudo tee /app/shop-okhwadang/backend/.env.production > /dev/null << 'EOF'
NODE_ENV=production
PORT=3000
BACKEND_URL=http://3.38.168.41:3000
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false
DATABASE_URL=mysql://user:password@<lightsail-private-ip>:3306/okhwadang
JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<openssl rand -hex 32>
PAYMENT_GATEWAY=mock
STORAGE_PROVIDER=s3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=okhwadang-assets
AWS_CDN_URL=https://dt24i8idwxww1.cloudfront.net
EOF

sudo chown ec2-user:ec2-user /app/shop-okhwadang/backend/.env.production
sudo chmod 600 /app/shop-okhwadang/backend/.env.production
```

---

## 참고 자료

- [AWS OIDC 문서](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
