---
globs: ["**/*.ts", "**/*.tsx"]
---
# Architecture Rules

Shared architectural concerns for both frontend and backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI (shadcn/ui)
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Auth**: JWT (Access + Refresh Token) + OAuth (Kakao/Google)
- **Cache**: In-memory (백엔드 프로세스의 CacheService, TTL 기반)
- **Storage**: S3/R2 compatible (selected by `STORAGE_PROVIDER` env)
- **Runtime**: Node.js 22

## Project Structure
See `backend/CLAUDE.md` and `src/CLAUDE.md` for detailed directory layouts.
