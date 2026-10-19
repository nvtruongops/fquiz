# Web hooks

Hooks in this folder coordinate client-side state, server requests, and browser interactions. Feature-specific quiz hooks are grouped under `quiz/`; other hooks support auth, classrooms, dashboard, community, and teacher workflows.

- Keep server validation and persistence in API handlers or feature services.
- Keep hooks scoped to client interaction and request state.
- Check existing callers before changing a hook's return shape or mutation behavior.
- Use [`docs/TESTING.md`](../../../docs/TESTING.md) for the test runner and discovery rules.
