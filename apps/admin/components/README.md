# Admin components

This directory contains UI used by the Admin application. Components are grouped by the administration area they support, with shared presentation primitives under `ui/`.

- Keep data fetching and mutations in hooks or server route handlers.
- Reuse shared primitives from `@fquiz/ui` when they fit.
- Use semantic theme tokens described in [`docs/DESIGN_THEME.md`](../../../docs/DESIGN_THEME.md).
- Check the current directory tree before adding a component inventory here.
