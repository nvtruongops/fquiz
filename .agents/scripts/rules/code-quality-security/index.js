const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['code-quality-security'];
    if (!policy || !policy.enabled) {
      ctx.logger.pass('Quy tắc CODE_QUALITY_SECURITY bị tắt hoặc chưa được cấu hình.');
      return { passed: true };
    }

    const searchDirs = [
      path.join(ctx.workspaceRoot, 'app'),
      path.join(ctx.workspaceRoot, 'components'),
      path.join(ctx.workspaceRoot, 'lib'),
      path.join(ctx.workspaceRoot, 'hooks'),
      path.join(ctx.workspaceRoot, 'store')
    ];

    let violations = 0;

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

          lines.forEach((line, idx) => {
            const prevLine = idx > 0 ? lines[idx - 1] : '';
            if (
              line.includes('// ponytail: allow-') || line.includes('eslint-disable') ||
              prevLine.includes('// ponytail: allow-') || prevLine.includes('eslint-disable')
            ) return;

            (policy.forbiddenPatterns || []).forEach(ruleItem => {
              const regex = new RegExp(ruleItem.regex, 'i');
              if (regex.test(line)) {
                const relPath = path.relative(ctx.workspaceRoot, fullPath);
                ctx.logger.error(`${relPath}:${idx + 1} -> Vi phạm Security: ${ruleItem.reason}`);
                violations++;
              }
            });
          });
        }
      }
    }

    searchDirs.forEach(dir => scanDir(dir));

    if (violations === 0) {
      ctx.logger.pass('Mã nguồn fquiz sạch (0 lỗ hổng Security & Hardcoded Secrets).');
    }

    return { passed: violations === 0 };
  }
};
