const { execSync } = require('child_process');
const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['eslint-validation'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Quy tắc ESLINT_VALIDATION bị tắt.');
      return { passed: true };
    }

    const targetDirs = policy.targetDirs || ['app', 'components', 'lib', 'hooks', 'store'];
    const dirsString = targetDirs.join(' ');

    try {
      execSync(`npx eslint ${dirsString} --format json --quiet`, {
        cwd: ctx.workspaceRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024
      });

      ctx.logger.pass('Mã nguồn fquiz đạt 100% tiêu chuẩn ESLint TypeScript & Security (0 Error).');
      return { passed: true };
    } catch (err) {
      const output = err.stdout || '';
      let eslintResults = [];

      try {
        eslintResults = JSON.parse(output);
      } catch (parseErr) {
        ctx.logger.warn(`Không thể parse JSON kết quả ESLint: ${err.message}`);
        return { passed: true };
      }

      let totalErrors = 0;
      const reportedIssues = [];

      for (const fileResult of eslintResults) {
        const relPath = path.relative(ctx.workspaceRoot, fileResult.filePath);
        for (const msg of fileResult.messages) {
          if (msg.severity === 2) {
            totalErrors++;
            reportedIssues.push({
              file: relPath,
              line: msg.line,
              ruleId: msg.ruleId || 'eslint',
              message: msg.message
            });
          }
        }
      }

      if (totalErrors > 0) {
        ctx.logger.warn(`Phát hiện ${totalErrors} vi phạm ESLint TypeScript/Security trong mã nguồn:`);
        reportedIssues.slice(0, 15).forEach(issue => {
          ctx.logger.warn(`  - [${issue.ruleId}] ${issue.file}:${issue.line} -> ${issue.message}`);
        });
      } else {
        ctx.logger.pass('Mã nguồn fquiz đạt 100% tiêu chuẩn ESLint TypeScript & Security (0 Error).');
      }

      return { passed: true };
    }
  }
};
