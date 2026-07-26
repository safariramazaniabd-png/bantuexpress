# BantuExpress — NestJS API

## Project state

Scaffold without `package.json` or `node_modules/`. Files are currently placed flat at project root but imports assume a `src/` directory structure per `nest-cli.json` (`sourceRoot: "src"`).

## Intended architecture (from imports)

```
src/
├── main.ts                  # entrypoint
├── app.module.ts            # root module (imports all feature modules)
├── config/
│   ├── auth.config.ts       # JWT config (namespace auth)
│   ├── database.config.ts   # Prisma/PostgreSQL config (namespace database)
│   └── env.validation.ts    # Joi-free, uses class-validator
├── common/
│   ├── filters/global-exception.filter.ts
│   ├── interceptors/audit.interceptor.ts
│   └── decorators/current-user.decorator.ts
├── database/
│   ├── database.module.ts   # @Global(), single PrismaService
│   └── prisma.service.ts
└── modules/
    ├── auth/                # Passport JWT strategy
    ├── audit/               # @Global() audit logging
    ├── identities/
    ├── geo/
    ├── landmarks/
    ├── sync/
    ├── delivery/
    └── notifications/
```

## Key facts

- **DB**: PostgreSQL + PostGIS via Prisma ORM. `database.module.ts` is `@Global()` — one PrismaService (one connection pool) for the whole app.
- **Auth**: JWT via `@nestjs/passport` + `passport-jwt`. Token validated on every request (account deactivation is immediate, not just at token issue).
- **BigInt serialization**: `main.ts:15` patches `BigInt.prototype.toJSON` — never convert BigInt fields manually in services.
- **Validation**: Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion: true`.
- **Security**: `helmet()` + CORS (configurable via `CORS_ORIGIN`, defaults to all origins in dev) + `ThrottlerGuard` (100 req/min/IP) + `enableShutdownHooks()` (for K8s).
- **Error handling**: `GlobalExceptionFilter` catches all exceptions, returns uniform JSON shape, suppresses internal details except in dev.
- **Env validation**: `class-validator`-based schema in `env.validation.ts` — app refuses to boot if required vars are missing.

## Setup

```bash
npm install           # then install Prisma CLI + generate client
cp .env.example .env  # fill in DATABASE_URL, JWT_SECRET, etc.
npx prisma generate
npm run start:dev
```

## Known issues

- Files are at root but imports expect a `src/` hierarchy. Before first successful build, files must be moved into their correct subdirectories under `src/`.
- `jwt.strategy.ts` and `global-exception.filter.ts` contain relative imports to paths (`../../../database/prisma.service`, `../../../common/decorators/...`) that will only resolve correctly once inside `src/modules/auth/strategies/` and `src/modules/...` respectively.
