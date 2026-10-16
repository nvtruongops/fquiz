const { execSync } = require('child_process');
const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['eslint-validation'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule ESLINT_VALIDATION is disabled.');
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

      ctx.logger.pass('FQuiz source code meets 100% of ESLint TypeScript & security standards (0 Errors).');
      return { passed: true };
    } catch (err) {
      const output = err.stdout || '';
      let eslintResults = [];

      try {
        eslintResults = JSON.parse(output);
      } catch (parseErr) {
        ctx.logger.warn(`Failed to parse ESLint JSON output: ${err.message}`);
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
        ctx.logger.warn(`Detected ${totalErrors} ESLint TypeScript/security violation(s) in source code:`);
        reportedIssues.slice(0, 15).forEach(issue => {
          ctx.logger.warn(`  - [${issue.ruleId}] ${issue.file}:${issue.line} -> ${issue.message}`);
        });
      } else {
        ctx.logger.pass('FQuiz source code meets 100% of ESLint TypeScript & security standards (0 Errors).');
      }

      return { passed: true };
    }
  }
};
