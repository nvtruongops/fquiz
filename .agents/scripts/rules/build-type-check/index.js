const { execSync } = require('child_process');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['build-type-check'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule BUILD_TYPE_CHECK is disabled.');
      return { passed: true };
    }

    try {
      execSync('npx turbo check-types', {
        cwd: ctx.workspaceRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      ctx.logger.pass('Frontend & API source code passed 100% TypeScript Type-Check (0 Errors).');
      return { passed: true };
    } catch (err) {
      const output = err.stdout || err.stderr || err.message || '';
      const lines = output.split('\n').filter(l => l.includes('error TS') || l.includes('Error:'));

      ctx.logger.error(`Detected ${lines.length || 1} TypeScript type check / syntax error(s) in source code:`);
      const reportedLines = lines.length > 0 ? lines : output.split('\n').filter(l => l.trim().length > 0);
      reportedLines.slice(0, 10).forEach(line => {
        ctx.logger.error(`  - ${line.trim()}`);
      });

      return { passed: false };
    }
  }
};
