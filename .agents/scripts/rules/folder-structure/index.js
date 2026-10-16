const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['folder-structure'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule FOLDER_STRUCTURE is disabled.');
      return { passed: true };
    }

    const requiredPaths = policy.requiredPaths || [
      'app',
      'app/api',
      'components',
      'lib/core',
      'lib/modules',
      'hooks',
      '.agents/skills'
    ];

    let missing = [];

    requiredPaths.forEach(relPath => {
      const fullPath = path.join(ctx.workspaceRoot, relPath);
      if (!ctx.fs.existsSync(fullPath)) {
        missing.push(relPath);
      }
    });

    if (missing.length > 0) {
      missing.forEach(p => {
        ctx.logger.error(`Missing standard repository directory: ${p}`);
      });
      return { passed: false };
    }

    ctx.logger.pass(`Repository folder structure 100% verified (${requiredPaths.length}/${requiredPaths.length} standard directories exist).`);
    return { passed: true };
  }
};
