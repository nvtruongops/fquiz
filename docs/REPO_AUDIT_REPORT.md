# Repository inventory snapshot

This is a static repository inventory captured on **2026-10-19** from tracked Git paths. It is not a test run, production check, full security audit, or user experience evaluation. Recalculate the counts after the repository changes.

## Snapshot

| Measure | Count | Method |
|---|---:|---|
| Tracked files | 1,382 | `git ls-files` |
| Tracked source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`) | 943 | Extension filter over `git ls-files` |
| API route files under Web and Admin | 103 | Tracked `apps/*/app/api/**/route.ts` paths |
| Source files over 200 lines | 103 | Line count of tracked source files |
| App-local model files, excluding test fixtures | 28 | `apps/admin/lib/models/` and feature `models/` directories |

Counts depend on the path filters and tracked state. They describe repository shape only; they do not measure quality, duplication severity, coverage, or runtime behavior.

## Follow-up observations

- The current Web quiz editor delegates question, import, validation, and save concerns to hooks and components. Recheck those boundaries before reusing older editor findings.
- The mobile quiz session page and question import flow have been split into supporting modules since earlier reports. The current code is the source of truth for remaining file-size concerns.
- App-local model files still exist. Their presence is an inventory observation, not proof that each is duplicated or safe to consolidate. Check import paths and runtime registration before moving any model.
- Historical audit documents may contain dated test, performance, or scorecard claims. They are not current verification evidence.

## Reproduce the inventory

Use PowerShell from the repository root:

```powershell
$tracked = @(git ls-files)
$source = @($tracked | Where-Object { $_ -match '\.(ts|tsx|js|jsx|mjs|cjs)$' })
$large = @($source | Where-Object { (Get-Content -LiteralPath $_ | Measure-Object -Line).Lines -gt 200 })
```

To refresh this page, preserve the same filters, update the snapshot date, and avoid adding test or quality claims unless the corresponding check was run in that update.
