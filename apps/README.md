# Applications

`apps/` contains independently runnable Next.js workspaces. Shared code belongs in `packages/` or a documented feature module; do not create direct imports between the Web and Admin apps.

| Workspace | Purpose | Guide |
|---|---|---|
| `web` | Student and teacher product | [Web README](./web/README.md) |
| `admin` | Administrative product | [Admin README](./admin/README.md) |

Package names, scripts, dependencies, and ports are defined by each app's `package.json`.
