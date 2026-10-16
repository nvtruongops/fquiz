const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['lint-issues'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule LINT_ISSUES is disabled.');
      return { passed: true };
    }

    const searchDirs = [
      path.join(ctx.workspaceRoot, 'apps/web'),
      path.join(ctx.workspaceRoot, 'apps/admin'),
      path.join(ctx.workspaceRoot, 'packages')
    ];

    let issues = [];

    function scanDir(dir) {
      if (!ctx.fs.existsSync(dir)) return;
      const entries = ctx.fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.next', '.turbo', '.vercel', 'dist', 'build', '__tests__'].includes(entry.name)) {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
          const content = ctx.fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          const relPath = path.relative(ctx.workspaceRoot, fullPath);

          // 1. Check Empty Catch Blocks
          if (policy.checkEmptyCatch !== false) {
            lines.forEach((line, idx) => {
              if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /catch\s*\{\s*\}/.test(line)) {
                issues.push({
                  file: relPath,
                  line: idx + 1,
                  type: 'Empty Catch Block',
                  message: 'Empty catch block swallows errors'
                });
              }
            });
          }

          // 2. Check Explicit Any type usage
          if (policy.checkExplicitAny !== false) {
            lines.forEach((line, idx) => {
              if (/:\s*any\b/.test(line) && !line.includes('eslint-disable')) {
                issues.push({
                  file: relPath,
                  line: idx + 1,
                  type: 'Explicit Any Type',
                  message: 'Excessive use of :any bypasses type safety'
                });
              }
            });
          }
        }
      }
    }

    searchDirs.forEach(dir => scanDir(dir));

    if (issues.length > 0) {
      ctx.logger.warn(`Detected ${issues.length} Lint Issue warning(s) in source code:`);
      issues.slice(0, 15).forEach(issue => {
        ctx.logger.warn(`  - [${issue.type}] ${issue.file}:${issue.line} -> ${issue.message}`);
      });
      return { passed: true };
    }

    ctx.logger.pass('No lint issues detected in fquiz source code (0 unused/swallowed errors/explicit any).');
    return { passed: true };
  }
};
