---
name: db-seed
description: Safely seed the local database, with optional full reset flow.
---

# DB Seed

Use this skill when the user asks to seed local shop data or reset-and-seed the local database.

## Safety checks

1. Confirm local backend Docker services are available:

```bash
cd backend && docker compose ps
```

2. If MySQL is not running, start it first:

```bash
cd backend && docker compose up -d
```

3. Confirm MySQL responds before seeding:

```bash
docker exec okhwadang-mysql mysqladmin ping -u root -p'changeme_root_password'
```

## Standard seed

```bash
cd backend && npm run seed
```

## Reset then seed

Use this only when the user explicitly requests reset semantics:

```bash
cd backend && docker compose down -v && docker compose up -d
cd backend && npm run migration:run && npm run seed
```

## Manual SQL rule

If you must seed with raw SQL for Korean text or other non-ASCII data, run `SET NAMES utf8mb4;` first and prefer single-row inserts.
