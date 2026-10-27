# Documentation index

This folder contains system-level design and operating guidance. Use the repository root README for setup and the workspace READMEs for folder-specific boundaries.

## System documentation

| Document | Scope |
|---|---|
| [Architecture](./ARCHITECTURE.md) | Workspace boundaries, dependency direction, and shared invariants. |
| [Design](./DESIGN.md) | Feature behavior and technical design details. |
| [Routes](./DESIGN_ROUTES.md) | Web and Admin route catalog. |
| [Theme](./DESIGN_THEME.md) | Theme tokens and UI conventions. |
| [API](./API.md) | HTTP endpoints and their documented contracts. |
| [Security](./SECURITY.md) | Authentication, authorization, and request protection. |
| [Testing](./TESTING.md) | Jest, Playwright, and repository verification commands. |
| [Deployment](./DEPLOYMENT.md) | App deployment configuration and operational references. |
| [Agent guide](../.agents/AGENTS.md) | Repository-specific instructions for coding agents. |

## How to keep these docs current

- Package names, scripts, and public exports come from each `package.json`.
- Jest and Playwright discovery come from `jest.config.ts` and `playwright.config.ts`.
- Route inventories should be checked against the current `app/` trees.
- Test counts and pass claims are run-specific. Add them only with a dated run record and its command.
- Audit findings are snapshots. Recheck the referenced code before treating an old finding as current.
