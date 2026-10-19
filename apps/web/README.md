# Web application

The `@fquiz/web` workspace serves student and teacher workflows. Its package scripts define development, build, lint, type-check, and start commands.

## Main folders

| Folder | Responsibility | Guide |
|---|---|---|
| `app/` | Next.js routes, layouts, and route handlers | [App routes](./app/README.md) |
| `components/` | Page and feature UI | [Components](./components/README.md) |
| `hooks/` | Client state and request coordination | [Hooks](./hooks/README.md) |
| `lib/core/` | Shared app infrastructure | [Core](./lib/core/README.md) |
| `lib/modules/` | Feature-owned server and domain code | [Feature modules](./lib/modules/README.md) |
| `store/` | Client-side Zustand stores | [Stores](./store/README.md) |

Use `@fquiz/*` packages for shared models, auth, database, and UI. Keep route handlers thin and place reusable feature behavior near its owning module. The root [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) records cross-workspace rules.
