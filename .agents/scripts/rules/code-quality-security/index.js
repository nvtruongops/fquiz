const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['code-quality-security'];
    if (!policy || !policy.enabled) {
      ctx.logger.pass('Rule CODE_QUALITY_SECURITY is disabled or unconfigured.');
      return { passed: true };
    }

    const searchDirs = [
      path.join(ctx.workspaceRoot, 'apps/web'),
      path.join(ctx.workspaceRoot, 'apps/admin'),
      path.join(ctx.workspaceRoot, 'packages')
    ];

    let violations = 0;

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
                ctx.logger.error(`${relPath}:${idx + 1} -> Security Violation: ${ruleItem.reason}`);
                violations++;
              }
            });
          });
        }
      }
    }

    searchDirs.forEach(dir => scanDir(dir));

    if (violations === 0) {
      ctx.logger.pass('FQuiz source code is clean (0 security vulnerabilities & hardcoded secrets).');
    }

    return { passed: violations === 0 };
  }
};
