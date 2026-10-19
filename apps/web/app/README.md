# Web routes

This is the Web application's Next.js App Router tree. Route segments and route handlers under this directory define the URLs and HTTP endpoints.

- Keep URL-specific page composition in route segments; move reusable UI to `components/`.
- Keep shared business behavior in `lib/modules/` or shared packages.
- Use [`docs/DESIGN_ROUTES.md`](../../../docs/DESIGN_ROUTES.md) as a route catalog, then confirm the current tree before changing routes.
- API contracts are documented in [`docs/API.md`](../../../docs/API.md); the route handlers remain authoritative.
