# Shared packages

`packages/` contains code intended for reuse across applications. Each package has its own manifest, TypeScript configuration, and entry points.

| Package | Responsibility | Guide |
|---|---|---|
| `auth` | Authentication and request security | [Auth](./auth/README.md) |
| `database` | MongoDB connection and model registration | [Database](./database/README.md) |
| `models` | Shared model and schema definitions | [Models](./models/README.md) |
| `ui` | Shared UI components and theme support | [UI](./ui/README.md) |
| `config-typescript` | Shared TypeScript presets | [TypeScript config](./config-typescript/README.md) |

Use package manifests as the source of truth for exports and scripts. Keep dependencies flowing from apps to shared packages, not between apps.
