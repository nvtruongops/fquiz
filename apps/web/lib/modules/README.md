# Web feature modules

Each subfolder owns feature-specific domain behavior, data access, schemas, and services. Current modules include AI, auth, classroom, community, and quiz.

| Module | Guide |
|---|---|
| AI | [AI module](./ai/README.md) |
| Auth | [Auth module](./auth/README.md) |
| Classroom | [Classroom module](./classroom/README.md) |
| Community | [Community module](./community/README.md) |
| Quiz | [Quiz module](./quiz/README.md) |

Keep cross-feature primitives in `lib/core/` and cross-app behavior in `packages/`. Shared models should be imported through `@fquiz/models`; check registration and callers before changing model ownership.
