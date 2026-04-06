# 원격 DB 접속 가이드

로컬 환경에서 원격 데이터베이스에 접속하는 방법입니다.

---

## Railway MySQL 접속 (Railway 배포)

Railway에서 제공하는 프록시로 직접 접속합니다.

### `.env` 설정

```env
MYSQL_HOST=yamabiko.proxy.rlwy.net
MYSQL_PORT=27950
MYSQL_USER=root
MYSQL_PASSWORD=<비밀번호>
MYSQL_DATABASE=railway
```

### MySQL 접속

```bash
mysql -h yamabiko.proxy.rlwy.net -P 27950 -u root -p<비밀번호> railway
```

### Seed 데이터 반영

```bash
mysql -h yamabiko.proxy.rlwy.net -P 27950 -u root -p<비밀번호> railway \
  --default-character-set=utf8mb4 < backend/src/database/seeds/okhwadang-seed.sql
```

---

## AWS Lightsail MySQL 접속 (SSH 터널)

### `.env` 설정

```env
SSH_TUNNEL_ENABLED=true
SSH_TUNNEL_REMOTE_HOST=<EC2 public IP>
SSH_TUNNEL_LOCAL_PORT=3307
SSH_TUNNEL_REMOTE_PORT=3306
SSH_KEY_PATH=~/.ssh/your-key.pem
```

### 터널 시작/종료

```bash
# 터널 시작
bash backend/scripts/start-ssh-tunnel.sh

# 터널 종료
bash backend/scripts/stop-ssh-tunnel.sh
```

### MySQL 접속

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p<password> okhwadang
```

### Seed 데이터 반영

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p<password> okhwadang \
  --default-character-set=utf8mb4 < backend/src/database/seeds/okhwadang-seed.sql
```

---

## ⚠️ 주의사항

1. **`.env` 파일은 Git에 커밋하지 않습니다** — 실제 비밀번호/키가 포함됩니다
2. **SSH 키는 `~/.ssh/` 디렉토리에 보관**하고 `.gitignore`에 포함합니다
3. **터널 사용 후 종료** — 사용하지 않을 때 `stop-ssh-tunnel.sh`로 종료합니다
4. **Railway 접속 정보**는 Railway 대시보드에서 확인하세요
