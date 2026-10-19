# Deployment and operations

Deployment settings are split between the Web and Admin app directories. Check the checked-in configuration and the active hosting project before changing production settings; this document does not establish the current state of an external deployment.

## Configuration sources

| Concern | Repository source |
|---|---|
| Web app build and runtime | `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/vercel.json` |
| Admin app build and runtime | `apps/admin/package.json`, `apps/admin/next.config.js`, `apps/admin/vercel.json` |
| Shared workspace tasks | Root `package.json` and `turbo.json` |
| Local environment variable names | [`.env.example`](../.env.example) |
| Database migrations and maintenance | [`scripts/`](../scripts/README.md) and the corresponding root scripts |

The apps are separate Next.js workspaces. Their local development ports and commands are defined in each app's `package.json`; Playwright server startup is defined in `playwright.config.ts`.

## Local production build

```bash
npm install
npm run build
npm run start:web
npm run start:admin
```

The start commands are separate long-running processes. Configure required secrets in the deployment provider; do not commit `.env.local` or credentials.

## Operational changes

Before running a migration, audit, cleanup, or performance command, inspect its implementation and options. Some root scripts load `.env.local` and may read or write a database. Prefer a documented dry-run option when available, and verify the target database before applying changes.

For test commands and the limits of test evidence, see [`TESTING.md`](./TESTING.md). For environment variable names, use `.env.example` as the current repository list; provider-specific values belong in the provider configuration.
