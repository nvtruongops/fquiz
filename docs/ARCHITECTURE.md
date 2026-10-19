# FQuiz architecture

FQuiz is an npm workspace monorepo with two Next.js applications and shared packages. The root `package.json` and `turbo.json` define workspace commands and task orchestration.

## Workspace boundaries

| Workspace | Responsibility |
|---|---|
| [`apps/web`](../apps/web/README.md) | Student and teacher product, including quiz, classroom, community, and learning flows. |
| [`apps/admin`](../apps/admin/README.md) | Administration UI and its application routes. |
| [`packages/auth`](../packages/auth/README.md) | Shared authentication and request security helpers. |
| [`packages/database`](../packages/database/README.md) | MongoDB connection and model registration support. |
| [`packages/models`](../packages/models/README.md) | Shared entities, schemas, and model definitions. |
| [`packages/ui`](../packages/ui/README.md) | Shared UI components, theme support, and utilities. |
| [`packages/config-typescript`](../packages/config-typescript/README.md) | Shared TypeScript compiler presets. |

## Dependency and data rules

- Web and Admin are separate applications. Keep shared behavior in `packages/` instead of importing one app from the other.
- Import shared models through `@fquiz/models`; avoid maintaining app-local copies when a shared model is the source of truth.
- Use explicit batch queries for related records rather than Mongoose `.populate()`.
- Quiz results and session completion are computed by server routes. Treat client state as input, not authoritative result data.
- Keep external services behind the module or package that owns their integration.

## Where implementation details live

- API route handlers: `apps/*/app/api/`.
- Web feature modules: `apps/web/lib/modules/`.
- Admin data and service helpers: `apps/admin/lib/`.
- Shared package entry points and exports: each package's `package.json` and `src/index.ts`.
- UI guidance: [`DESIGN_THEME.md`](./DESIGN_THEME.md) and [`design-system/`](../design-system/README.md).
- Test discovery and commands: [`TESTING.md`](./TESTING.md), `jest.config.ts`, and `playwright.config.ts`.

Treat detailed diagrams, route lists, and audit findings as documentation snapshots. Confirm them against source when changing the corresponding behavior.
