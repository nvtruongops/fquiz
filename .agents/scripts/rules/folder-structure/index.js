const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['folder-structure'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Quy tắc FOLDER_STRUCTURE bị tắt.');
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
        ctx.logger.error(`Thiếu thư mục cấu trúc chuẩn của dự án: ${p}`);
      });
      return { passed: false };
    }

    ctx.logger.pass(`Cấu trúc thư mục dự án fquiz hoàn tất 100% (${requiredPaths.length}/${requiredPaths.length} thư mục chuẩn tồn tại).`);
    return { passed: true };
  }
};
