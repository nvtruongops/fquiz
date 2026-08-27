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

    let violations = 0;

    // 1. Check Cross-App Imports across apps/ and packages/
    const scanTargets = [
      { name: 'web', dir: path.join(ctx.workspaceRoot, 'apps/web'), forbiddenApps: ['apps/admin', '@fquiz/admin'] },
      { name: 'admin', dir: path.join(ctx.workspaceRoot, 'apps/admin'), forbiddenApps: ['apps/web', '@fquiz/web'] },
      { name: 'packages', dir: path.join(ctx.workspaceRoot, 'packages'), forbiddenApps: ['apps/web', 'apps/admin', '@fquiz/web', '@fquiz/admin'] }
    ];

    function scanAppDir(targetName, dir, forbiddenPatterns) {
      if (!ctx.fs.existsSync(dir)) return;
      const entries = ctx.fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.next', 'dist', 'build', '__tests__'].includes(entry.name)) {
            scanAppDir(targetName, fullPath, forbiddenPatterns);
          }
        } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
          const content = ctx.fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          const relPath = path.relative(ctx.workspaceRoot, fullPath);

          lines.forEach((line, idx) => {
            if (line.includes('// ponytail: allow-') || line.includes('eslint-disable')) return;

            // Check forbidden cross-app import
            for (const forbidden of forbiddenPatterns) {
              const regex = new RegExp(`from\\s+['"]${forbidden}`, 'i');
              if (regex.test(line)) {
                ctx.logger.error(`${relPath}:${idx + 1} -> Cross-App Boundary Violation: '${targetName}' không được import trực tiếp từ '${forbidden}'!`);
                violations++;
              }
            }
          });
        }
      }
    }

    scanTargets.forEach(target => {
      scanAppDir(target.name, target.dir, target.forbiddenApps);
    });

    // 2. Check internal module boundary within lib/modules (cross-module model import & .populate)
    let modulesDir = path.join(ctx.workspaceRoot, 'apps/web/lib/modules');
    if (!ctx.fs.existsSync(modulesDir)) {
      modulesDir = path.join(ctx.workspaceRoot, 'lib/modules');
    }

    if (ctx.fs.existsSync(modulesDir)) {
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

              // Check .populate() usage in domain modules
              if (/\.populate\s*\(/.test(line) && !line.includes('// ponytail: allow-populate')) {
                ctx.logger.error(`${relPath}:${idx + 1} -> Mongoose .populate() Usage: Không sử dụng Mongoose .populate() trong module '${currentModuleName}'! Dùng batch query với $in.`);
                violations++;
              }
            });
          }
        }
      }

      moduleFolders.forEach(modName => {
        scanModuleDir(modName, path.join(modulesDir, modName));
      });
    }

    if (violations === 0) {
      ctx.logger.pass('Ranh giới Module & Quy chuẩn Database fquiz đạt 100% (0 Cross-Module Import, 0 Mongoose .populate).');
    }

    return { passed: violations === 0 };
  }
};

