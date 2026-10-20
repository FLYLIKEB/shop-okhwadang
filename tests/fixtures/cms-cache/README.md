# CMS 공개 캐시 회귀 fixture

운영 데이터 없이 실제 Next production Data Cache와 공개 콘텐츠의 `no-store` 정책을 검증한다.
테스트 전용 prime route로 과거 정책의 cached200을 먼저 생성한다. backend를 직접 변경한 뒤
그 cached200이 여전히 warm인 상태에서도 공개 페이지·저널 상세와 저널 목록은 최신 상태를 반환해야 한다.
ko/en 모두 수정, 비공개, 재공개, slug 변경, 삭제를 확인한다.

저장소 루트에서 실행한다.

```bash
CI=true node node_modules/next/dist/bin/next build tests/fixtures/cms-cache
node scripts/test-cms-cache.mjs
```

Node 메모리 backend와 임시 포트를 사용하며 종료 시 두 서버를 정리한다.
fixture의 prime route는 테스트 전용이며 앱 배포에는 포함되지 않는다.
mutation은 Next 또는 관리 client callback을 경유하지 않고 메모리 backend를 직접 호출한다.
전체 Nest/DB 통합 테스트를 대체하지 않으며 직접 쓰기 경로와 무관하게 공개 읽기가 권위 있는 backend를 확인함을 검증한다.

인증된 backend→Next 캐시 통지 경로가 없으므로 콘텐츠 조회는 `no-store`로 처리한다.
이는 저장 후 별도 무효화 요청의 유실·실패와 무인증 캐시 삭제 액션을 피하고,
페이지/블록/저널의 어떤 쓰기 경로에서도 비공개 전환을 즉시 반영한다.
대신 콘텐츠 SSR마다 backend 조회가 발생한다. 카탈로그·설정·내비게이션 캐시는 유지한다.
