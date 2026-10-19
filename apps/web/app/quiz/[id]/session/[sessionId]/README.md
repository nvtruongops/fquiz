# Quiz session routes

This route segment contains the active quiz session pages for a quiz and session identifier, including the mobile-specific route where present.

- Keep route-level loading and page composition here; reusable session UI belongs in `apps/web/components/quiz/session/`.
- Session state and answer synchronization are coordinated by `apps/web/hooks/quiz/` and the quiz feature module.
- The server owns answer validation, grading, and session completion.
- Confirm current route files before relying on device redirects or URL behavior; this README is not a route detector specification.

See [`docs/API.md`](../../../../../../../docs/API.md) and [`docs/TESTING.md`](../../../../../../../docs/TESTING.md).
