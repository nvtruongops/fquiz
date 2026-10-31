# FQuiz

FQuiz is a modern, secure, and scalable online quiz and learning platform for students and administrators, organized as an npm workspace monorepo. It contains a student and teacher web app, a separate admin app, and shared TypeScript packages. Production is live at [fquiz.online](https://fquiz.online).

## Workspace map

| Path | Purpose |
|---|---|
| [`apps/web`](./apps/web/README.md) | Student and teacher application; development server on port 3000. |
| [`apps/admin`](./apps/admin/README.md) | Administration application; development server on port 3001. |
| [`packages`](./packages/README.md) | Shared auth, database, models, UI, and TypeScript configuration packages. |
| [`e2e`](./e2e/README.md) | Playwright browser scenarios for both applications. |
| [`scripts`](./scripts/README.md) | Maintenance, audit, migration, and performance scripts. |
| [`design-system`](./design-system/README.md) | Shared design rules and page-specific guidance. |
| [`docs`](./docs/README.md) | Architecture, API, security, testing, operations, and audit documents. |
| [`.agents`](./.agents/AGENTS.md) | Repository guidance for coding agents. |

## Quick start

Use the Node.js version required by the repository tooling, install from the root, and configure local values using [`.env.example`](./.env.example).

```bash
npm install
npm run dev
```

The Web app runs at `http://localhost:3000`; the Admin app runs at `http://localhost:3001`. Each app can also be started with `npm run dev:web` or `npm run dev:admin`.

## Common commands

| Command | Purpose |
|---|---|
| `npm run build` | Build configured workspaces through Turborepo. |
| `npm run lint` | Run workspace lint scripts. |
| `npm run check-types` | Run TypeScript checks for configured workspaces. |
| `npm test` | Run Jest tests selected by `jest.config.ts`. |
| `npm run test:e2e` | Run Playwright specs from `e2e/`; starts both apps as configured in `playwright.config.ts`. |
| `node .agents/scripts/verify.js --strict` | Run repository governance checks. |

These commands describe available scripts, not their latest results. See [`docs/TESTING.md`](./docs/TESTING.md) for runner configuration and verification guidance.

## Documentation

Start at the [documentation index](./docs/README.md). It links to the architecture, API, security, design, testing, deployment, and repository audit documents. Folder READMEs describe local boundaries; package manifests and runner configuration remain the source of truth for names, exports, and commands.
