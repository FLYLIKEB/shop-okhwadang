# Docker Compose 인프라

## 개요

로컬 개발 환경의 모든 서비스를 Docker Compose로 통합 관리한다.

---

## 서비스 구성

| 서비스 | 이미지 | 포트 | 용도 |
|--------|--------|------|------|
| mysql | mysql:8.0 | 3306 | 메인 DB |
| redis | redis:7 | 6379 | 캐싱, 세션 |

---

## docker-compose.yml (예시)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: commerce-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: commerce
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: commerce-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

---

## 사용법

### 시작

```bash
cd backend
docker compose up -d
```

### 종료

```bash
docker compose down
```

### 데이터 초기화 (볼륨 삭제)

```bash
docker compose down -v
docker compose up -d
```

### 상태 확인

```bash
docker compose ps
docker compose logs mysql
```

---

## 환경별 설정

| 환경 | DB | 설명 |
|------|-----|------|
| dev | Docker MySQL (로컬) | `LOCAL_DATABASE_URL` |
| test | Docker MySQL (로컬) | `TEST_DATABASE_URL`, DB명에 `test` 필수 |
| staging | AWS Lightsail MySQL | SSH 터널 경유 |
| prod | AWS Lightsail MySQL | `DATABASE_URL` (EC2 → Lightsail 내부 IP) |

---

## 주의사항

- Docker 볼륨은 `docker compose down -v` 시에만 삭제됨
- MySQL root 비밀번호는 `.env` 파일에서 관리 (커밋 금지)
- `--default-authentication-plugin=mysql_native_password` 설정 필수
