const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['skills-governance'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Quy tắc SKILLS_GOVERNANCE bị tắt.');
      return { passed: true };
    }

    const skillsDir = path.join(ctx.workspaceRoot, '.agents/skills');
    if (!ctx.fs.existsSync(skillsDir)) {
      ctx.logger.error('Không tìm thấy thư mục .agents/skills!');
      return { passed: false };
    }

    const entries = ctx.fs.readdirSync(skillsDir, { withFileTypes: true });
    let totalSkills = 0;
    let errors = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        totalSkills++;
        const skillName = entry.name;
        const skillMdPath = path.join(skillsDir, skillName, 'SKILL.md');

        if (!ctx.fs.existsSync(skillMdPath)) {
          ctx.logger.error(`Skill '${skillName}' thiếu file SKILL.md bắt buộc!`);
          errors++;
          continue;
        }

        const content = ctx.fs.readFileSync(skillMdPath, 'utf8');
        if (!content.startsWith('---') || !content.includes('name:') || !content.includes('description:')) {
          ctx.logger.error(`Skill '${skillName}' có file SKILL.md nhưng thiếu YAML frontmatter 'name' hoặc 'description'!`);
          errors++;
        }
      }
    }

    if (errors > 0) {
      return { passed: false };
    }

    ctx.logger.pass(`Kiểm tra ${totalSkills} skill(s) trong .agents/skills hợp lệ 100% (SKILL.md & Frontmatter OK).`);
    return { passed: true };
  }
};
