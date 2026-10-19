# Admin application

The `@fquiz/admin` workspace is the administration app. Its scripts and dependencies are defined in this directory's `package.json`; development uses port 3001.

## Main folders

| Folder | Responsibility |
|---|---|
| `app/` | Admin pages, layouts, and API route handlers. |
| `components/` | Admin-specific screens and reusable UI. |
| `hooks/` | Admin client queries and mutations. |
| `lib/` | Admin data access, auth, and server-side helpers. |

Keep Web and Admin independent. Put code needed by both apps in a shared package, and import shared models through `@fquiz/models`. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and [`docs/SECURITY.md`](../../docs/SECURITY.md).
