import { execFileSync } from 'child_process'

function runGit(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', stdio: 'pipe' }).trim()
  } catch (error: any) {
    throw new Error(error.stderr?.trim() || error.message)
  }
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

    // 2. Resolve commit message
    const args = process.argv.slice(2)
    let commitMessage = args.join(' ').trim()

    if (!commitMessage) {
      const maxFilesToShow = 3
      const fileSummary = changedFiles.slice(0, maxFilesToShow).join(', ')
      const remainingCount = changedFiles.length - maxFilesToShow
      const fileSuffix = remainingCount > 0 ? ` and ${remainingCount} other files` : ''
      const timestamp = new Date().toISOString()
      
      commitMessage = `auto: update ${fileSummary}${fileSuffix} [${timestamp}]`
    }

    console.log('\x1b[33m%s\x1b[0m', `📝 Commit message: "${commitMessage}"`)

    // 3. Execute git add
    console.log('Staging changes...')
    runGit(['add', '.'])

    // 4. Execute git commit
    console.log('Committing changes...')
    runGit(['commit', '-m', commitMessage])

    // 5. Execute git push
    console.log('Pushing to remote repository...')
    // Display push progress directly in terminal
    execFileSync('git', ['push'], { stdio: 'inherit' })

    console.log('\x1b[32m%s\x1b[0m', '🎉 Automated push completed successfully!')
  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', '❌ An error occurred during execution:')
    console.error(error.message || error)
    process.exit(1)
  }
}

main()
