# Deployment and operations

Deployment settings are split between the Web and Admin app directories. Check the checked-in configuration and the active hosting project before changing production settings; this document does not establish the current state of an external deployment.

## Configuration sources

| Concern | Repository source |
|---|---|
| Web app build and runtime | `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/vercel.json` |
| Admin app build and runtime | `apps/admin/package.json`, `apps/admin/next.config.js`, `apps/admin/vercel.json` |
| Shared workspace tasks | Root `package.json` and `turbo.json` |
| Application environment variable names | [`.env.example`](../.env.example) |
| VPS hostnames and tunnel ID | [`.env.domains.example`](../.env.domains.example); store actual values only in the ignored `.env.domains` file |
| Database migrations and maintenance | [`scripts/`](../scripts/) and the corresponding root scripts |

The apps are separate Next.js workspaces. Their local development ports and commands are defined in each app's `package.json`; Playwright server startup is defined in `playwright.config.ts`. Set `APP_URL` or `NEXT_PUBLIC_APP_URL` for the Web canonical URL, `NEXT_PUBLIC_ADMIN_URL` for the Admin URL, and `NEXT_PUBLIC_WEB_URL` for the Web return link in the Admin login page.

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

## Vercel production deployment

Production uses two separate Vercel projects: `fquiz-web` with project root `apps/web`, and `fquiz-admin` with project root `apps/admin`. Run the CLI from the monorepo root and pass the project name explicitly so Vercel applies each configured root directory:

```bash
vercel deploy --dry --json --project fquiz-web --cwd .
vercel deploy --dry --json --project fquiz-admin --cwd .
vercel deploy --prod --yes --project fquiz-web --cwd .
vercel deploy --prod --yes --project fquiz-admin --cwd .
```

The root `.vercelignore` excludes documentation, end-to-end test artifacts, and agent tooling from upload. After deployment, inspect each returned deployment URL with `vercel inspect <url> --wait` and check the public app routes.

## Self-Hosted Linux VPS Production Deployment (via SSH on `main`)

For self-hosted deployments on a dedicated Linux VPS (Ubuntu 22.04/24.04 LTS) using PM2 cluster mode behind Caddy/Nginx reverse proxy:
- `ecosystem.config.js`: PM2 cluster process supervision for `@fquiz/web` (`:3000`) and `@fquiz/admin` (`:3001`).
- `deploy/Caddyfile`: Caddy template with automatic SSL and HTTP/3.
- `deploy/nginx.conf`: Nginx template with rate limiting and static caching.
- `deploy/docker-compose.mongodb.yml` & `deploy/backup-mongodb.sh`: Isolated local MongoDB 7 service and automated daily backup rotation.
- `deploy/deploy-vps.sh`: Atomic zero-downtime deployment script with healthcheck and rollback.
- `deploy/vps-setup.sh`: Automated server bootstrap and hardening.

Copy `.env.domains.example` to `.env.domains`, set the hostnames, ACME email, and Cloudflare tunnel UUID, then render configs with `node --env-file=.env.domains deploy/render-vps-configs.mjs`. Install the generated files from `deploy/generated/` into the corresponding Caddy, Nginx, and Cloudflare Tunnel config paths. The generated directory and `.env.domains` are ignored by Git.

Vercel environment variables `APP_URL`, `NEXT_PUBLIC_WEB_URL`, and `NEXT_PUBLIC_ADMIN_URL` control canonical URLs and `.vercel.app` redirects. Configure these in both production projects; keep analytics URL and site IDs in provider environment settings as well.

Keep `ENCRYPTION_KEY` set in production. If existing encrypted provider keys were written with a previous key, temporarily set `ENCRYPTION_KEY_PREV` (comma-separated if there are several), re-enter those provider keys in Admin settings, then remove the previous key.


