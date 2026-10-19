# Testing and verification

This page describes how the repository discovers and runs checks. A listed command is not evidence that it has passed; record results with the command and date when reporting a run.

## Test runners

| Runner | Scope and source of truth |
|---|---|
| Jest | `jest.config.ts` defines separate Web, Admin, and shared projects, Node environment, aliases, and coverage collection. Specs use `.test.ts` or `.test.tsx`. |
| Playwright | `playwright.config.ts` selects `e2e/`, uses Chromium, and starts the Web and Admin production servers on ports 3000 and 3001. |
| Governance script | `.agents/scripts/verify.js` checks repository rules; it is separate from Jest and Playwright. |

## Commands

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:e2e:ui
npm run lint
npm run check-types
node .agents/scripts/verify.js --strict
```

Run a targeted Playwright spec by passing its path, for example:

```bash
npm run test:e2e -- e2e/quiz-session.spec.ts
```

The E2E configuration starts `npm run start -w apps/web` and `npm run start -w apps/admin`. Build both apps before invoking Playwright if fresh production output is needed.

## Reporting results

- Do not keep suite counts or pass badges in evergreen docs. They become stale when files change.
- For a verification claim, include the exact command, date, exit status, and any skipped suites or external prerequisites.
- Distinguish static inspection from executed tests, browser interaction, and measured performance.
- Performance scripts can require `.env.local`, database access, or external services. Read their source and command flags before running them.
