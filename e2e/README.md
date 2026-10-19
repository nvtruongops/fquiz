# End-to-end tests

This directory contains Playwright browser scenarios and helpers. `playwright.config.ts` defines test discovery, browser settings, and startup of the Web and Admin production servers.

- Specs use the `.spec.ts` suffix.
- Shared browser helpers live under `helpers/`.
- Run the suite with `npm run test:e2e`; run a single spec by passing its path.
- Keep test data and external-service assumptions explicit in the spec or helper.

See [`docs/TESTING.md`](../docs/TESTING.md) for commands and evidence reporting.
