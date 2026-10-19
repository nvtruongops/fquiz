# Web components

This directory contains UI for the Web app, grouped by product area. The current folder tree is the source for component names; this guide records boundaries rather than maintaining a second file inventory.

| Area | Guide |
|---|---|
| Quiz flows | [Quiz components](./quiz/README.md) |
| Shared primitives, providers, and auth UI | [Shared components](./shared/README.md) |

Keep components focused on rendering and interaction. Put reusable request coordination in hooks and server-side business rules in `lib/`. Use the shared UI package and semantic theme tokens when applicable.
