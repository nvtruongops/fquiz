const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['cross-module-boundary'];
    if (!policy || !policy.enabled) {
      ctx.logger.pass('Quy tắc CROSS_MODULE_BOUNDARY bị tắt hoặc chưa cấu hình.');
      return { passed: true };
    }

    const modulesDir = path.join(ctx.workspaceRoot, 'lib/modules');
    if (!ctx.fs.existsSync(modulesDir)) {
      ctx.logger.pass('Không tìm thấy thư mục lib/modules, bỏ qua kiểm tra.');
      return { passed: true };
    }

    let violations = 0;

    const moduleFolders = ctx.fs.readdirSync(modulesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    function scanModuleDir(currentModuleName, dir) {
      const entries = ctx.fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '__tests__'].includes(entry.name)) {
            scanModuleDir(currentModuleName, fullPath);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
          const content = ctx.fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          const relPath = path.relative(ctx.workspaceRoot, fullPath);

          lines.forEach((line, idx) => {
            if (line.includes('// ponytail: allow-cross-module') || line.includes('eslint-disable')) return;

            // Check cross-module model import
            for (const otherModule of moduleFolders) {
              if (otherModule === currentModuleName) continue;

              const crossModelImportRegex = new RegExp(`from\\s+['"]@/lib/modules/${otherModule}/models`, 'i');
              if (crossModelImportRegex.test(line)) {
                ctx.logger.error(`${relPath}:${idx + 1} -> Cross-Module Model Import: Module '${currentModuleName}' không được import Model trực tiếp từ module '${otherModule}'!`);
                violations++;
              }
            }

            // Check .populate() usage
            if (/\.populate\s*\(/.test(line) && !line.includes('// ponytail: allow-populate')) {
              ctx.logger.error(`${relPath}:${idx + 1} -> Mongoose .populate() Usage: Không sử dụng Mongoose .populate() theo chuẩn fquiz! Dùng batch query với $in.`);
              violations++;
            }
          });
        }
      }
    }

    moduleFolders.forEach(modName => {
      scanModuleDir(modName, path.join(modulesDir, modName));
    });

    if (violations === 0) {
      ctx.logger.pass('Ranh giới Module & Quy chuẩn Database fquiz đạt 100% (0 Cross-Module Import, 0 Mongoose .populate).');
    }

    return { passed: violations === 0 };
  }
};
