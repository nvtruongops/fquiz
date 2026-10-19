---
name: vercel-deploy
description: Verify the Web and Admin Vercel project mapping and deployment configuration for the FQuiz monorepo.
version: 3.0
priority: high
---

# Vercel deployment guide

FQuiz has separate Web and Admin Next.js workspaces. This guide describes repository checks; read the active Vercel project settings before a deployment because project IDs, domains, and root-directory settings can change outside Git.

## Configuration sources

- Web: `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/vercel.json`.
- Admin: `apps/admin/package.json`, `apps/admin/next.config.js`, `apps/admin/vercel.json`.
- Workspace tasks: root `package.json` and `turbo.json`.
- Local variable names: root `.env.example`.
- Vercel project linkage, when present: `.vercel/project.json` in the working directory used by the CLI. These files may be local and are not an authoritative record of the active provider configuration.

## Before deploying

1. Confirm the user requested a deployment and identify whether Web, Admin, or both are in scope.
2. Inspect the selected Vercel project's linked repository, root directory, build settings, environment, and domain in the provider or CLI.
3. Confirm the CLI is linked to the intended app. Do not rely on project IDs or production URLs copied from older documentation.
4. Run the checks required for the change. Available commands include `npm run lint`, `npm run check-types`, `npm test`, `npm run build:web`, `npm run build:admin`, and `node .agents/scripts/verify.js --strict`.
5. Record exact commands and results. Do not use suite counts or old pass claims as evidence.

## After deployment

Verify the deployment URL from the active Vercel project. Check the relevant public routes and app-specific authentication flow, then inspect deployment logs for errors. Report the deployed project, URL, revision, and checks performed.

## Troubleshooting

Inspect the app's checked-in config, Vercel project settings, and CLI linkage together. If they disagree, stop before deploying and resolve which project configuration is intended.
