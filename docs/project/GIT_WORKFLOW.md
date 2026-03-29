# Git & PR Workflow

## 이슈 기반 개발 순서

1. `git checkout main && git pull && git checkout -b feature/issue-{번호}-{설명}`
2. 구현
3. 빌드 & 테스트 확인
   ```bash
   npm run build && npm run test:run
   cd backend && npm run build && npm run test
   ```
4. `git commit -m "feat: #번호 설명"`
5. `git pull --rebase origin feature/issue-{번호}-{설명}` → push
6. `gh pr create` — 본문에 `Closes #번호` 필수

---

## 브랜치 규칙

- **모든 신규 작업은 반드시 main에서 시작** — 예외 없음
  ```bash
  git checkout main && git pull origin main && git checkout -b feature/issue-{번호}-{설명}
  ```
- 기존 브랜치 작업 중이면 전환 없이 현재 브랜치 유지
- **main/master 직접 커밋 금지**

---

## 커밋 메시지 (한국어)

```
feat: #123 기능명             # 새 기능
fix: #123 버그 설명           # 버그 수정
refactor: 리팩터링 설명       # 기능 변경 없는 코드 개선
docs: 문서 추가/수정          # 문서
style: 코드 스타일 변경       # 포맷팅, 세미콜론 등
test: 테스트 추가/수정        # 테스트
chore: 빌드/설정 변경         # 빌드, 패키지 등
```

---

## PR 생성

```bash
gh pr create --title "feat: #번호 기능명" --body "$(cat <<'EOF'
## Summary
- Closes #번호
- 변경 내용

## Test plan
- [ ] npm run build
- [ ] npm run test:run
- [ ] cd backend && npm run build && npm run test
EOF
)"
```

---

## PR 머지

```bash
gh pr merge --merge --delete-branch
```

- **squash 금지** — merge commit 사용

---

## Push 전 필수

```bash
git pull --rebase origin <브랜치명>
```

---

## DB 스키마 변경 시

1. `*.entity.ts` 수정
2. Migration 생성: `npm run migration:generate -- migrations/MigrationName`
3. **엔티티 + Migration 파일 함께 커밋**
4. E2E 테스트 통과 확인

참조: `.claude/rules/database.md`, `docs/infrastructure/DATABASE.md`

---

## PR 리뷰 반영

PR 리뷰를 반영할 때는 모든 리뷰를 한번에 처리 후 단일 커밋으로 푸시:

```bash
git add .
git commit -m "fix: [PR #번호 리뷰 반영] 주요 변경사항"
git push
```

리뷰 반영 후 해결된 스레드는 자동 resolve 처리.
