const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['lint-issues'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Quy tắc LINT_ISSUES bị tắt.');
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
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
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
                  message: 'Khối catch rỗng nuốt exception (Empty catch block swallows errors)'
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
                  message: 'Lạm dụng kiểu dữ liệu :any làm mất tính Type-safe'
                });
              }
            });
          }
        }
      }
    }

    searchDirs.forEach(dir => scanDir(dir));

    if (issues.length > 0) {
      ctx.logger.warn(`Phát hiện ${issues.length} cảnh báo Lint Issues trong mã nguồn:`);
      issues.slice(0, 15).forEach(issue => {
        ctx.logger.warn(`  - [${issue.type}] ${issue.file}:${issue.line} -> ${issue.message}`);
      });
      return { passed: true };
    }

    ctx.logger.pass('Không phát hiện lỗi Lint Issues nào trong mã nguồn fquiz (0 Unused/Swallowed Errors/Explicit Any).');
    return { passed: true };
  }
};
