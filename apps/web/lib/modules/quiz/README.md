# Quiz feature module

This module owns quiz domain logic used by Web routes and UI, including session processing, question validation, question-bank operations, imports, and quiz utilities.

- Treat server-side session data as authoritative for grading and completion.
- Keep validation rules close to the domain service and schema that enforce them.
- Avoid duplicating shared schema definitions; use `@fquiz/models` where the model is shared.
- Update [`docs/API.md`](../../../../../docs/API.md) for API changes and [`docs/TESTING.md`](../../../../../docs/TESTING.md) for runner guidance.
