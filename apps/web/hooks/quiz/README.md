# Quiz hooks

This folder groups client hooks for quiz authoring, active sessions, and related interactions. Check the current source tree for exact hook names and responsibilities.

Hooks coordinate client state and requests. Keep grading, authorization, and persistence rules in server code, and check all hook callers before changing returned state or mutation behavior.

See the [quiz component guide](../../components/quiz/README.md), [quiz module guide](../../lib/modules/quiz/README.md), and [`docs/TESTING.md`](../../../../docs/TESTING.md).
