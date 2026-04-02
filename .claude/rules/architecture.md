---
globs: ["**/*.ts", "**/*.tsx"]
---
# Architecture Rules

Shared architectural concerns for both frontend and backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS v4 + Radix UI (shadcn/ui)
- **Backend**: NestJS + TypeORM + MySQL 8.0
- **Auth**: JWT (Access + Refresh Token) + OAuth (Kakao/Google)
- **Cache**: Redis
- **Storage**: S3/R2 compatible (selected by `STORAGE_PROVIDER` env)
- **Runtime**: Node.js 22

## Project Structure
See `backend/CLAUDE.md` and `src/CLAUDE.md` for detailed directory layouts.
