---
name: safe-terminal-execution
description: Standard operating procedures and patterns to prevent terminal commands, Git operations, and background tasks from hanging, freezing, or blocking on interactive prompts.
version: 1.0
priority: high
---

# Safe Terminal Execution & Anti-Hang Standard (FQuiz Monorepo)

Use this skill when running commands, executing Git workflows, managing background processes, or running test suites in the FQuiz Turborepo monorepo to ensure zero hangs, bounded timeouts, and reliable non-interactive execution.

---

## 1. 🛡️ Headless & Non-Interactive Mandate

The FQuiz agent environment executes in automated PowerShell and Bash shells. All commands must be strictly non-interactive.

### Git & GitHub Remote Operations
Interactive credential prompts (especially Windows `git-credential-manager.exe`) freeze execution indefinitely when running headless.

**Rules for Git Operations:**
1. **Always Set Headless Environment Variables:**
   - PowerShell:
     ```powershell
     $env:GIT_TERMINAL_PROMPT = "0"
     $env:GCM_INTERACTIVE = "never"
     ```
   - Bash / POSIX:
     ```bash
     export GIT_TERMINAL_PROMPT=0
     export GCM_INTERACTIVE=never
     ```
2. **Setup Git with GitHub CLI (`gh`):**
   - Ensure credential helper routes to GitHub CLI:
     ```bash
     gh auth setup-git
     ```
3. **Fail-Fast Network Flags:**
   ```bash
   git -c credential.interactive=never -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 push origin <branch>
   ```
4. **Mandatory Local Verification Before Push (Zero Cloud CI/CD):**
   - Always execute and pass full local verification gates (`npm run lint`, `npm run check-types`, `npm test`, `node .agents/scripts/verify.js --strict`) locally before `git push`.
   - All GitHub Actions workflows and remote CI/CD are completely removed from this repository.
   - Strictly prohibit creating, configuring, or expecting cloud CI/CD pipelines via Git. All validation authority is 100% local.

### Monorepo Tooling & Package Management
- **npm**:
  - Always use `npm ci --legacy-peer-deps` for repeatable, non-interactive installations.
  - Pass `--yes` to `npx` (e.g. `npx --yes ...`).
  - Pass `--no-audit --no-fund` to eliminate unnecessary network pauses.
- **Turborepo**:
  - Run with `--verbosity=error` or standard task runner flags.

---

## 2. ⏱️ Bounded Execution & Command Timeouts

Every shell command executed via `run_command` must have bounded execution to prevent infinite hangs.

### Network Requests
- **curl**:
  ```bash
  curl --max-time 30 --connect-timeout 10 -fsSL <URL>
  ```
- **ssh**:
  ```bash
  ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new <user>@<host> "<command>"
  ```

### PowerShell Bounded Timeout Pattern
For commands or scripts that do not have built-in timeout flags:
```powershell
$job = Start-Job -ScriptBlock { <COMMAND> }
$completed = Wait-Job $job -Timeout <SECONDS>
if (-not $completed) {
    Stop-Job $job
    Remove-Job $job -Force
    throw "Command timed out after <SECONDS>s"
}
Receive-Job $job
Remove-Job $job
```

### `run_command` Parameter Rules
- **Synchronous Verifications** (`npm test`, `npm run lint`, `check-types`, `verify.js`):
  - Set `WaitMsBeforeAsync: 8000` to `10000` (8-10 seconds).
  - Never set `IsDaemon: true` for build/test/verification tasks.
- **Daemons / Persistent Servers** (`npm run dev:web`, `npm run dev:admin`, Cloudflare tunnels):
  - MUST set `IsDaemon: true`.
  - Set `WaitMsBeforeAsync: 500`.

---

## 3. 🚨 Background Task Supervision & Recovery Protocol

When a command takes longer than `WaitMsBeforeAsync` and transitions into a background task:

1. **Active Supervision:**
   - Wait for the reactive wakeup message.
   - If no message arrives within the expected runtime (e.g. > 30-60s for git push or quick tests), check status:
     - `manage_task(Action='status', TaskId=...)`
     - Read the task's log file.
2. **Stall Detection:**
   - Log file is 0 bytes and elapsed time exceeds normal duration.
   - Process list indicates waiting child processes (`git-credential-manager`, `OpenSSH`, `conhost`).
3. **Immediate Remediation:**
   - Kill the task: `manage_task(Action='kill', TaskId=...)`.
   - Force-terminate orphaned child processes:
     ```powershell
     Stop-Process -Name "git", "git-credential-manager", "git-remote-https" -Force -ErrorAction SilentlyContinue
     ```
   - Diagnose root cause and re-run with non-interactive flags or `--no-verify`.
