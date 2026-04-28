# Sensitive Information Rules

**민감 정보가 포함된 문서는 절대 git에 commit하지 않습니다.**

| 구분 | 예시 | 처리 |
|------|------|------|
| AWS 리소스 ID/IP | Instance ID, Public IP, VPC ID, Account ID | `{{PLACEHOLDER}}`로 교체 후 `.env.secrets` 참조 가이드 추가 |
| SSH/RDP 접속 정보 | Key Pair 이름, Bastion Host | `.env.secrets`에만 저장 |
| API Key/시크릿 | AWS Access Key, Secret, PG API Key | GitHub Secrets 또는 `.env.secrets` 관리 |
| DB 접속 정보 | 호스트, 포트, DB 이름 | `.env.secrets`에만 저장 |

## 인프라 문서 작성 시

1. 리소스 ID, IP, ARN 등은 `{{EC2_INSTANCE_ID}}` 등 형식으로 placeholder 사용
2. 문서 상단에 리소스 값 참조 방법을 AWS CLI 명령어로 명시
3. 실제 값은 `.env.secrets` (또는 GitHub Secrets)에만 보관
4. Commit 전 `git diff`로 민감 정보 포함 여부 확인

## 관련 파일

- `docs/infrastructure/s3-cloudfront-cdn.md` — 모든 민감값 placeholder 처리됨
- `.gitignore`에 `docs/infrastructure/s3-cloudfront-cdn.md` 추가됨 (로컬 임시 파일)
