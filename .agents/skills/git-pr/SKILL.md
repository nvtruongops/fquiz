---
name: git-pr
description: Standard workflow to verify, create, and manage Pull Requests (PR) for FQuiz. Enforces rule engine verification (.agents), local CodeQL database scanning (.codeql-db), branch naming conventions, structured PR templates, non-interactive Git safety, and GitHub CLI integration (gh pr create).
version: 1.1
priority: high
---

# FQuiz Git Pull Request (PR) & Remote Workflow

Use this skill when creating a Pull Request, submitting feature branches, pushing commits, or preparing code reviews for integration into `main` or `develop`.

---

## 📋 1. Pre-PR Checklist & Automated Verification

Before creating a Pull Request, execute the full local verification suite:

```bash
# 1. Rule Engine & Governance Verification
node .agents/scripts/verify.js --strict

# 2. CodeQL Local Security & Quality Scan
codeql database create .codeql-db --language=javascript-typescript --overwrite
codeql database analyze .codeql-db codeql/javascript-queries --format=sarif-latest --output=codeql-results.sarif

# 3. Unit Tests & Lint Audit
npm run lint
npm run check-types
npm test
```

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

## Verification & Checkpoints
- [x] Rule Engine: \`node .agents/scripts/verify.js --strict\` (0 errors)
- [x] CodeQL Scan: \`.codeql-db\` analyzed with 0 high severity alerts
- [x] Jest Unit Tests: \`npm test\` passed
- [x] Build: \`npm run build\` passed cleanly
"
```

---

## 🔍 5. Review Checkpoints & Merging Guidelines

1. **Rule Engine Status**: Verify GitHub Actions workflow passed `node .agents/scripts/verify.js --strict`.
2. **CodeQL Scan**: Confirm 0 High/Critical security alerts reported by CodeQL.
3. **No Direct Push to Protected Branches**: Merge via GitHub PR approval or `gh pr merge --squash --delete-branch`.
