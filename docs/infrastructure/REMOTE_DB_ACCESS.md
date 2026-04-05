# 원격 DB 접속 가이드

로컬 환경에서 AWS Lightsail MySQL 원격 데이터베이스에 접속하는 방법입니다.

## SSH 터널을 통한 접속

### 1. 사전 준비

#### `.env` 설정 (`backend/.env`)

```env
SSH_TUNNEL_ENABLED=true
SSH_TUNNEL_REMOTE_HOST=<EC2 public IP>
SSH_TUNNEL_LOCAL_PORT=3307
SSH_TUNNEL_REMOTE_PORT=3306
SSH_KEY_PATH=~/.ssh/your-key.pem
```

| 변수 | 설명 |
|------|------|
| `SSH_TUNNEL_ENABLED` | `true`로 설정하여 터널 활성화 |
| `SSH_TUNNEL_REMOTE_HOST` | AWS EC2의 공인 IP 주소 |
| `SSH_KEY_PATH` | EC2 접속용 SSH 개인키 경로 |

### 2. 터널 시작/종료

```bash
# 터널 시작
bash backend/scripts/start-ssh-tunnel.sh

# 터널 종료
bash backend/scripts/stop-ssh-tunnel.sh
```

터널이 실행되면 로컬 포트 `3307`으로 원격 MySQL에 접속할 수 있습니다.

### 3. MySQL 클라이언트로 접속

```bash
# 로컬 Docker MySQL (포트 3307)
mysql -h 127.0.0.1 -P 3307 -u root -pchangeme_root_password okhwadang

# 원격 DB (터널 사용 시, 같은 포트)
mysql -h 127.0.0.1 -P 3307 -u <db_user> -p<password> okhwadang
```

### 4. Seed 데이터 반영

```bash
# 로컬 DB에 seed 적용
mysql -h 127.0.0.1 -P 3307 -u root -pchangeme_root_password okhwadang < backend/src/database/seeds/okhwadang-seed.sql

# 원격 DB에 seed 적용 (터널 필요)
mysql -h 127.0.0.1 -P 3307 -u <user> -p<password> okhwadang < backend/src/database/seeds/okhwadang-seed.sql
```

## Docker Compose로 원격 DB 접속

`.env`에 원격 DB URL을 직접 설정:

```env
DATABASE_URL=mysql://user:password@127.0.0.1:3307/okhwadang
```

이후 백엔드 실행 시 자동으로 원격 DB에 연결됩니다.

## ⚠️ 주의사항

1. **`.env` 파일은 Git에 커밋하지 않습니다** — 실제 비밀번호/키가 포함됩니다
2. **SSH 키는 `~/.ssh/` 디렉토리에 보관**하고 `.gitignore`에 포함합니다
3. **터널 사용 후 종료** — 사용하지 않을 때 `stop-ssh-tunnel.sh`로 종료합니다
4. **본딩 이슈**: EC2 인바운드 규칙에서 MySQL(3306) 포트가 허용되어야 합니다
