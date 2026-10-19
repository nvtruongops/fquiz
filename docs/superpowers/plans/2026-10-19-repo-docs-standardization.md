# Repository documentation standardization plan

> **For agentic workers:** Use this checklist to update and verify the
> documentation in small, reviewable groups.

**Goal:** Make repository and folder documentation match the current FQuiz
workspace structure and avoid stale implementation or test claims.

**Architecture:** Keep the root README as the entry point, `docs/README.md` as
the documentation index, and concise READMEs at workspace boundaries. Treat
package manifests, source entry points, and runner configuration as canonical.

**Tech Stack:** Markdown, npm workspaces, Jest, Playwright, PowerShell.

**Spec:** User request to update folder documentation for the current repo.

## Global constraints

- Derive commands and package names from tracked manifests and configuration.
- Report test commands without claiming results unless they run in this task.
- Keep detailed behavior in its existing design or task document.
- Use relative links between repository documents.

---

### Task 1: Confirm documentation boundaries and sources

**Files:** `package.json`, workspace manifests, runner configuration,
tracked README files, `.agents/AGENTS.md`

- [x] Inventory current workspaces, docs, and existing folder READMEs.
- [x] Identify stale test counts and report claims.
- [x] Use current source paths and manifests as documentation evidence.

### Task 2: Refresh central project documentation

**Files:** `README.md`, `docs/README.md`, `docs/ARCHITECTURE.md`,
`docs/TESTING.md`, `docs/REPO_AUDIT_REPORT.md`, `docs/DEPLOYMENT.md`,
`docs/DATABASE_VECTOR_AI_AUDIT.md`, `.agents/AGENTS.md`

- [x] Remove unverified pass badges and conflicting test counts.
- [x] Describe the current workspace and folder boundaries.
- [x] Mark old audit items with current status and evidence limits.
- [x] Preserve historical performance claims as historical context.

### Task 3: Add and align folder guides

**Files:** `apps/`, `apps/web/`, `apps/admin/`, `packages/`, each shared
package, `design-system/`, `e2e/`, `scripts/`, `test/`, and existing
`apps/web` folder READMEs

- [x] Add concise READMEs for undocumented workspace boundaries.
- [x] Replace stale file inventories with folder responsibilities and links.
- [x] Align feature wording with current product scope.

### Task 4: Validate the documentation changes

**Files:** Every modified Markdown document

- [x] Check Markdown links against tracked and new paths (46 changed Markdown files).
- [x] Run `git diff --check` and review the full diff for stale claims.
- [ ] Report documentation checks separately from tests not run.
