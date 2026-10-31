import { execFileSync, execSync } from 'child_process'

export function getCommitMessageArgs(args: string[]): string {
  if (args.includes('--skip-verify')) {
    throw new Error('--skip-verify is not supported; the local verification gate is mandatory')
  }
  return args.join(' ').trim()
}

function runGit(args: string[]): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GCM_INTERACTIVE: 'never'
      }
    }).trim()
  } catch (error: any) {
    throw new Error(error.stderr?.trim() || error.message)
  }
}

function runLocalCheck(command: string) {
  console.log('\x1b[34m%s\x1b[0m', `⏳ Running local gate: ${command}`)
  execSync(command, { stdio: 'inherit' })
}

function main() {
  console.log('\x1b[36m%s\x1b[0m', '🚀 Starting automated commit and push workflow...')

  try {
    // 1. Check Git status
    const status = runGit(['status', '--porcelain'])
    if (!status) {
      console.log('\x1b[32m%s\x1b[0m', '✅ No changes detected to commit.')
      return
    }

    // Retrieve list of changed files for automatic commit message
    const changedFiles = status
      .split('\n')
      .map(line => line.slice(3).trim())
      .filter(Boolean)

    // 2. Resolve arguments and commit message
    let commitMessage = getCommitMessageArgs(process.argv.slice(2))

    // 3. Mandatory Local Verification Gate (Zero Cloud CI/CD)
    console.log('\x1b[36m%s\x1b[0m', '🛡️ Enforcing 100% Local Verification Gate (Zero Cloud CI/CD)...')
    runLocalCheck('npm run lint')
    runLocalCheck('npm run check-types')
    runLocalCheck('npm test')
    runLocalCheck('node .agents/scripts/verify.js --strict')
    console.log('\x1b[32m%s\x1b[0m', '✅ All local verification gates passed cleanly!')

    if (!commitMessage) {
      const maxFilesToShow = 3
      const fileSummary = changedFiles.slice(0, maxFilesToShow).join(', ')
      const remainingCount = changedFiles.length - maxFilesToShow
      const fileSuffix = remainingCount > 0 ? ` and ${remainingCount} other files` : ''
      const timestamp = new Date().toISOString()
      
      commitMessage = `auto: update ${fileSummary}${fileSuffix} [${timestamp}]`
    }

    console.log('\x1b[33m%s\x1b[0m', `📝 Commit message: "${commitMessage}"`)

    // 4. Execute git add
    console.log('Staging changes...')
    runGit(['add', '.'])

    // 5. Execute git commit
    console.log('Committing changes...')
    runGit(['commit', '-m', commitMessage])

    // 6. Execute git push with fail-fast non-interactive options
    console.log('Pushing to remote repository (headless & fail-fast)...')
    execFileSync('git', [
      '-c', 'credential.interactive=never',
      '-c', 'http.lowSpeedLimit=1000',
      '-c', 'http.lowSpeedTime=30',
      'push'
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GCM_INTERACTIVE: 'never'
      }
    })

    console.log('\x1b[32m%s\x1b[0m', '🎉 Automated push completed successfully!')
  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', '❌ An error occurred during execution:')
    console.error(error.message || error)
    process.exit(1)
  }
}

if (require.main === module) main()
