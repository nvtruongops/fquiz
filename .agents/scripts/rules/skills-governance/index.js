const path = require('path');
const meta = require('./meta.json');

module.exports = {
  meta,
  async execute(ctx) {
    const policy = ctx.policies['skills-governance'] || {};
    if (policy.enabled === false) {
      ctx.logger.pass('Rule SKILLS_GOVERNANCE is disabled.');
      return { passed: true };
    }

    const skillsDir = path.join(ctx.workspaceRoot, '.agents/skills');
    if (!ctx.fs.existsSync(skillsDir)) {
      ctx.logger.error('Directory .agents/skills not found!');
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
          ctx.logger.error(`Skill '${skillName}' is missing required SKILL.md file!`);
          errors++;
          continue;
        }

        const content = ctx.fs.readFileSync(skillMdPath, 'utf8');
        if (!content.startsWith('---') || !content.includes('name:') || !content.includes('description:')) {
          ctx.logger.error(`Skill '${skillName}' has a SKILL.md file but is missing YAML frontmatter 'name' or 'description'!`);
          errors++;
        }
      }
    }

    if (errors > 0) {
      return { passed: false };
    }

    ctx.logger.pass(`All ${totalSkills} skill(s) in .agents/skills verified 100% valid (SKILL.md & Frontmatter OK).`);
    return { passed: true };
  }
};
