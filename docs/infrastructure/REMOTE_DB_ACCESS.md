# 원격 DB 접속 가이드

프로덕션 데이터베이스는 **AWS Lightsail MySQL**로 운영합니다.
실제 호스트/계정/비밀번호는 모두 **`.env.secrets`** (gitignored)에 기록되어 있으므로 이 문서에는 키 이름만 표기합니다.

> 참고: `.claude/rules/sensitive-info.md` — 민감 정보 처리 규칙

---

## 접속 경로

```
로컬                SSH                 VPC peering
개발자 ─────────────► EC2(bastion) ────────────────► Lightsail MySQL
                     172.31.8.153             172.26.x.x (private)
```

- Lightsail DB는 **publicly accessible** 이지만, **MySQL 사용자 host 제한**으로 EC2 사설IP(`172.31.8.153`)에서만 앱 계정이 로그인 가능합니다.
- EC2 ↔ Lightsail 간에는 VPC peering이 구성되어 있어, EC2에서 endpoint로 접속하면 private IP(`172.26.x.x`)로 라우팅됩니다.
- 로컬에서 DB에 직접 붙어야 할 때는 **EC2를 bastion으로 SSH 터널**을 엽니다.

---

## EC2에서 직접 접속 (운영/배포)

```bash
ssh -i $BASTION_KEY $BASTION_USER@$BASTION_HOST   # .env.secrets 참조

# EC2 내부에서:
mysql -h $LIGHTSAIL_DB_HOST \
      -u $APP_DB_USER -p"$APP_DB_PASSWORD" \
      commerce --connect-timeout=10
```

- `BASTION_HOST`, `BASTION_USER`, `BASTION_KEY` → `.env.secrets`
- `LIGHTSAIL_DB_HOST`, `APP_DB_USER`, `APP_DB_PASSWORD` → `.env.secrets`

---

## 로컬에서 SSH 터널로 접속 (마이그레이션/시드)

```bash
# 1) 터널 오픈 (포그라운드 유지)
ssh -i $BASTION_KEY -N \
    -L 3307:$LIGHTSAIL_DB_HOST:3306 \
    $BASTION_USER@$BASTION_HOST

# 2) 다른 터미널에서 접속
mysql -h 127.0.0.1 -P 3307 \
      -u $APP_DB_USER -p"$APP_DB_PASSWORD" commerce
```

> 앱 계정(`okhwadang_app`)은 `172.31.8.153` host만 허용되므로 터널 경유 시에도 EC2에서 나가는 트래픽으로 보여 OK입니다.

### TypeORM 마이그레이션 실행

**권장: 원격 실행 스크립트**
```bash
bash scripts/remote-migration.sh run      # 대기 중인 마이그레이션 실행
bash scripts/remote-migration.sh revert   # 마지막 1건 되돌리기
bash scripts/remote-migration.sh show     # 적용/미적용 목록
```
스크립트는 `.env.secrets`의 `BASTION_*`를 읽어 EC2에 SSH로 접속 후 백엔드 디렉토리에서 `NODE_ENV=production`으로 실행합니다.

**수동 (SSH 터널 방식)**
```bash
# 터널 열어둔 상태에서
cd backend
LOCAL_DATABASE_URL=mysql://$APP_DB_USER:$APP_DB_PASSWORD@127.0.0.1:3307/commerce \
  npm run migration:run
```

### 시드 데이터 반영

```bash
mysql -h 127.0.0.1 -P 3307 -u $APP_DB_USER -p"$APP_DB_PASSWORD" commerce \
      --default-character-set=utf8mb4 \
      < backend/src/database/seeds/okhwadang-seed.sql
```

---

## 관리 계정 (dbadmin)

`dbadmin@%` 은 host 제한이 없는 관리 계정입니다. 계정/권한 변경, 긴급 대응 외에는 사용하지 마세요.
DDL/DML 운영 작업은 `okhwadang_app`을 기본으로 사용합니다.

---

## 주의사항

1. **`.env.secrets`, SSH 키(`*.pem`)는 절대 Git에 커밋하지 않습니다** — `.gitignore` 확인
2. **SSH 키 권한**: `chmod 400 <key>.pem`
3. **터널은 사용 후 종료** (Ctrl+C)
4. **앱 계정(`okhwadang_app`) host 제한**은 EC2 사설IP(`172.31.8.153`)를 기준으로 합니다. EC2를 재생성하거나 사설IP가 바뀌면 `dbadmin`으로 접속해 host 재등록이 필요합니다.
