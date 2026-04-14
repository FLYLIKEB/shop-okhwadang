# AWS Secrets Manager Setup

## Overview

This document describes the AWS Secrets Manager integration for Phase 1 of the AWS deployment. Secrets Manager stores sensitive configuration values that must not be committed to source control.

## Secret Structure

**Secret Name**: `okhwadang/production`

| Key | Description |
|-----|-------------|
| `MYSQL_PASSWORD` | Production MySQL database password |
| `JWT_SECRET` | JWT signing secret (256-bit) |
| `JWT_REFRESH_SECRET` | JWT refresh token secret (must differ from JWT_SECRET) |
| `TOSS_SECRET_KEY` | Toss Payments secret key (ko locale) |
| `STRIPE_SECRET_KEY` | Stripe secret key (global locale) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `REDIS_PASSWORD` | Redis password |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials secret access key |

### Secret Format

Secrets are stored as JSON key-value pairs:

```json
{
  "MYSQL_PASSWORD": "your-db-password",
  "JWT_SECRET": "your-jwt-secret",
  "JWT_REFRESH_SECRET": "your-refresh-secret",
  "TOSS_SECRET_KEY": "your-toss-secret",
  "STRIPE_SECRET_KEY": "your-stripe-secret",
  "STRIPE_WEBHOOK_SECRET": "your-stripe-webhook-secret",
  "REDIS_PASSWORD": "your-redis-password",
  "AWS_SECRET_ACCESS_KEY": "your-aws-secret-key"
}
```

## EC2 IAM Role

The EC2 instance running the backend must have an IAM role with `secretsmanager:GetSecretValue` permission.

### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-northeast-2:*:secret:okhwadang/*"
    }
  ]
}
```

### Attach to EC2 Instance

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name OkhwadangSecretsManagerPolicy \
  --policy-document file://infra/secrets/iam-policy.json

# Create IAM role (for EC2)
aws iam create-role \
  --role-name OkhwadangEC2Role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

# Attach policy to role
aws iam attach-role-policy \
  --role-name OkhwadangEC2Role \
  --policy-arn arn:aws:iam::123456789012:policy/OkhwadangSecretsManagerPolicy

# Create instance profile and attach role
aws iam create-instance-profile --instance-profile-name OkhwadangEC2Role
aws iam add-role-to-instance-profile \
  --instance-profile-name OkhwadangEC2Role \
  --role-name OkhwadangEC2Role

# Associate IAM role with EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxxxxxxxxxxxxxx \
  --iam-instance-profile Name=OkhwadangEC2Role
```

**Note**: Replace `123456789012` with your AWS Account ID and `i-xxx` with your EC2 Instance ID.

## GitHub Actions (Optional)

GitHub Actions can reference Secrets Manager via OIDC federation:

```yaml
- name: Fetch secrets from Secrets Manager
  uses: aws-actions/aws-secrets-manager-get-secrets@v1
  with:
    secret-ids: |
      okhwadang/production
    parse-json: true
```

Requires OIDC trust configuration between GitHub and AWS.

## Migration Plan

### Phase 1 (Current)
- [x] Sensitive values documented in this file
- [x] IAM permissions specified
- [x] NestJS integration guide created

### Phase 2 (Implementation)
- [ ] Create `okhwadang/production` secret in AWS Secrets Manager
- [ ] Populate all sensitive values
- [ ] Attach IAM role to EC2 instance
- [ ] Deploy and test secrets loader

### Phase 3 (Transition)
- [ ] Update EC2 startup script to fetch secrets at boot
- [ ] Remove sensitive values from `.env` (non-production environments keep local values)
- [ ] Verify all services start correctly with Secrets Manager
- [ ] Remove hardcoded secrets from any deployment scripts

### What Stays in .env (Non-Sensitive)

These values remain in `.env` as they are not security-sensitive:

```env
NODE_ENV=production
PORT=3000
MYSQL_HOST=your-host
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_DATABASE=okhwadang
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://ockhwadang.com
REDIS_URL=redis://localhost:6380
PAYMENT_GATEWAY=toss
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=your-bucket
AWS_ACCESS_KEY_ID=your-access-key  # Use IAM role instead for production
AWS_CDN_URL=https://cdn.ockhwadang.com
STORAGE_PROVIDER=s3
```

## Creating the Secret

```bash
# Create the secret
aws secretsmanager create-secret \
  --name okhwadang/production \
  --description "Production secrets for Okhwadang e-commerce" \
  --secret-string file://infra/secrets/secret-template.json \
  --region ap-northeast-2

# Verify
aws secretsmanager get-secret-value \
  --secret-id okhwadang/production \
  --region ap-northeast-2
```

## Rotating Secrets

```bash
# Update secret value
aws secretsmanager put-secret-value \
  --secret-id okhwadang/production \
  --secret-string '{"MYSQL_PASSWORD":"new-password",...}' \
  --region ap-northeast-2

# Restart backend service to pick up new values
ssh ec2-user@your-ec2-ip "pm2 restart okhwadang-backend"
```
