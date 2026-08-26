import { execSync } from 'child_process'

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim()
  } catch (error: any) {
    throw new Error(error.stderr?.trim() || error.message)
  }
}

function main() {
  console.log('\x1b[36m%s\x1b[0m', '🚀 Bắt đầu quá trình tự động commit và push...')

  try {
    // 1. Kiểm tra trạng thái Git
    const status = runCommand('git status --porcelain')
    if (!status) {
      console.log('\x1b[32m%s\x1b[0m', '✅ Không có thay đổi nào cần commit.')
      return
    }

    // Lấy danh sách các file thay đổi để tạo commit message tự động
    const changedFiles = status
      .split('\n')
      .map(line => line.slice(3).trim())
      .filter(Boolean)

    // 2. Xác định commit message
    const args = process.argv.slice(2)
    let commitMessage = args.join(' ').trim()

    if (!commitMessage) {
      const maxFilesToShow = 3
      const fileSummary = changedFiles.slice(0, maxFilesToShow).join(', ')
      const remainingCount = changedFiles.length - maxFilesToShow
      const fileSuffix = remainingCount > 0 ? ` và ${remainingCount} file khác` : ''
      const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      
      commitMessage = `auto: cập nhật ${fileSummary}${fileSuffix} [${timestamp}]`
    }

    console.log('\x1b[33m%s\x1b[0m', `📝 Commit message: "${commitMessage}"`)

    // 3. Thực hiện git add
    console.log('Staging changes...')
    runCommand('git add .')

    // 4. Thực hiện git commit
    console.log('Committing changes...')
    // Escape double quotes in commit message
    const escapedMsg = commitMessage.replace(/"/g, '\\"')
    runCommand(`git commit -m "${escapedMsg}"`)

    // 5. Thực hiện git push
    console.log('Pushing to remote repository...')
    // Để hiển thị tiến trình push trực tiếp lên terminal
    execSync('git push', { stdio: 'inherit' })

    console.log('\x1b[32m%s\x1b[0m', '🎉 Tự động push hoàn tất thành công!')
  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Đã xảy ra lỗi trong quá trình thực hiện:')
    console.error(error.message || error)
    process.exit(1)
  }
}

main()
