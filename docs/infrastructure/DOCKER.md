# Docker Compose 인프라

## 개요

로컬 개발 환경의 MySQL을 Docker Compose로 관리한다. 캐시는 백엔드 프로세스 내 in-memory `CacheService`(TTL 기반)를 사용하므로 Redis 컨테이너는 필요하지 않다.

---

## 서비스 구성

| 서비스 | 이미지 | 포트 (host → container) | 용도 |
|--------|--------|-------------------------|------|
| mysql | mysql:8.0 | 3307 → 3306 | 메인 DB |

---

## docker-compose.yml (요약)

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: okhwadang-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: commerce
    ports:
      - "127.0.0.1:3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
```

실제 파일: [`backend/docker-compose.yml`](../../backend/docker-compose.yml)

---

## 사용법

```bash
cd backend
docker compose up -d          # 시작
docker compose down           # 종료
docker compose down -v        # 데이터 초기화 (볼륨 삭제)
docker compose ps             # 상태 확인
docker compose logs mysql     # 로그 확인
```

---

## 환경별 DB

| 환경 | DB | 설명 |
|------|-----|------|
| dev | Docker MySQL (로컬) | `LOCAL_DATABASE_URL` |
| test | Docker MySQL (로컬) | `TEST_DATABASE_URL`, DB명에 `test` 필수 |
| staging | AWS Lightsail MySQL | SSH 터널 경유 |
| prod | AWS Lightsail MySQL | `DATABASE_URL` (EC2 → Lightsail 내부 IP) |

---

## 주의사항

- 볼륨은 `docker compose down -v` 시에만 삭제됨
- MySQL root 비밀번호는 `.env` 파일에서 관리 (커밋 금지)
