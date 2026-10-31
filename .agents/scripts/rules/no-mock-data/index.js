const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['no-mock-data'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule NO_MOCK_DATA is disabled.');
      return { passed: true };
    }

    const searchDirs = (policy.searchDirs || ['app/api', 'lib/modules']).map(d => path.join(ctx.workspaceRoot, d));
    let mockCount = 0;

    function scanDir(dir) {
      if (!ctx.fs.existsSync(dir)) return;
      const entries = ctx.fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.next', '.turbo', '.vercel', 'dist', 'build', '__tests__'].includes(entry.name)) {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) {
          const content = ctx.fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          const relPath = path.relative(ctx.workspaceRoot, fullPath);

          lines.forEach((line, idx) => {
            (policy.forbiddenPatterns || []).forEach(ruleItem => {
              const regex = new RegExp(ruleItem.regex, 'i');
              if (regex.test(line)) {
                ctx.logger.warn(`${relPath}:${idx + 1} -> ${ruleItem.reason}`);
                mockCount++;
              }
            });
          });
        }
      }
    }

    searchDirs.forEach(dir => scanDir(dir));

    if (mockCount > 0) {
      ctx.logger.warn(`Detected ${mockCount} suspected mock data instance(s) in production API/modules.`);
      return { passed: true };
    }

    ctx.logger.pass('No hardcoded mock objects detected in production API/modules.');
    return { passed: true };
  }
};
