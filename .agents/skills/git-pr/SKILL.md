---
name: git-pr
description: Standard workflow to verify, create, and manage Pull Requests (PR) and Git pushes for FQuiz. Enforces 100% LOCAL validation gates (.agents rule engine, TypeScript check, ESLint, Jest unit tests, CodeQL) BEFORE any git push, with ZERO cloud CI/CD pipelines initialized or expected via Git.
version: 2.0
priority: high
---

# FQuiz Git Pull Request (PR) & Remote Workflow

Use this skill when creating a Pull Request, submitting feature branches, pushing commits, or preparing code reviews for integration into `main` or `develop`.

---

## 🚫 Zero Cloud CI/CD Invariant (Mandatory)

1. **Remote Cloud CI/CD is Removed**: All GitHub Actions workflows (`.github/workflows/`) have been completely removed from this repository.
2. **Local Gate Authority**: All code validation—including linting, TypeScript compiler checks, Jest test execution, security scanning, and rule engine governance—must run and pass **LOCALLY** before running `git push`.
3. **No Cloud CI Initialization**: Agents and developers are **strictly prohibited** from initializing, committing, creating, or expecting GitHub Actions workflows or any cloud CI/CD pipelines via Git.

---

## 📋 1. Pre-Push & Pre-PR Mandatory Local Verification Gate

Before running `git push` or creating a Pull Request, execute and confirm passing the full local verification suite:

```bash
# 1. Monorepo ESLint Quality & Security Audit
npm run lint

# 2. Workspace TypeScript Compiler Check (apps/* & packages/*)
npm run check-types

# 3. Jest Unit & Integration Tests
npm test

# 4. Rule Engine & Architecture Governance Verification (Strict Mode)
node .agents/scripts/verify.js --strict

# 5. (Optional) CodeQL Local Security & Quality Scan
codeql database create .codeql-db --language=javascript-typescript --overwrite
codeql database analyze .codeql-db codeql/javascript-queries --format=sarif-latest --output=codeql-results.sarif
```

> ⚠️ **FAIL-CLOSED POLICY**: If any local check fails, you must fix the root cause locally. Never push failing code or bypass local checks hoping for cloud CI verification.

---

## 🔒 2. Non-Interactive Git & Terminal Safety Protocol

To prevent `git push`, `git fetch`, or hooks from hanging indefinitely on GUI credential managers (`git-credential-manager.exe`) or terminal prompts:

1. **Pre-Flight Authentication:**
   ```bash
   gh auth status
   gh auth setup-git
   ```
2. **Headless Environment Variables:**
   - PowerShell:
     ```powershell
     $env:GIT_TERMINAL_PROMPT = "0"
     $env:GCM_INTERACTIVE = "never"
     ```
   - Bash:
     ```bash
     export GIT_TERMINAL_PROMPT=0
     export GCM_INTERACTIVE=never
     ```
3. **Fail-Fast Network Operations:**
   ```bash
   git -c credential.interactive=never -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 push origin <branch>
   ```

---

## 🌿 3. Branch Naming & Commit Conventions

- **Feature Branch**: `feat/<short-description>` (e.g. `feat/mix-quiz-tab`)
- **Bug Fix Branch**: `fix/<short-description>` (e.g. `fix/codeql-xss-sanitization`)
- **Refactor Branch**: `refactor/<short-description>` (e.g. `refactor/theme-governance`)
- **Commit Message Format**: Conventional Commits standard:
  - `feat(scope): title`
  - `fix(scope): title`
  - `refactor(scope): title`

---

## 🚀 4. Creating a Pull Request with GitHub CLI (`gh`)

Use `gh pr create` with structured title, body, and review checkpoints:

```bash
gh pr create \
  --title "feat(scope): concise description of changes" \
  --body "## Summary
Brief description of what this PR accomplishes.

## Key Changes
- Change 1
- Security / CodeQL fix 2

## Verification & Checkpoints (Local-Only Gates)
- [x] ESLint: \`npm run lint\` passed (0 errors)
- [x] TypeScript Type-Check: \`npm run check-types\` passed (0 errors)
- [x] Jest Unit Tests: \`npm test\` passed
- [x] Rule Engine: \`node .agents/scripts/verify.js --strict\` (0 errors)
- [x] Production Build: \`npm run build\` passed cleanly
"
```

---

## 🔍 5. Review Checkpoints & Merging Guidelines

1. **Local Verification Status**: Confirm all local verification gates (`npm run lint`, `npm run check-types`, `npm test`, `node .agents/scripts/verify.js --strict`) passed cleanly with 0 errors on the local machine prior to push. No remote cloud CI/CD is run or triggered.
2. **CodeQL Scan**: Confirm 0 High/Critical security alerts reported by local CodeQL if executed.
3. **No Direct Push to Protected Branches**: Merge via GitHub PR approval or `gh pr merge --squash --delete-branch`.
