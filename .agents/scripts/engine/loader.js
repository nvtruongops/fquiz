/**
 * Auto-Discovery & Loader Engine for Rule Plugins v2.1
 */

const fs = require('fs');
const path = require('path');

class RuleLoader {
  static loadManifest(rootDir) {
    const manifestPath = path.join(rootDir, '.agents/manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (err) {
        console.error(`⚠️ Unable to parse manifest.json: ${err.message}`);
      }
    }
    return { schemaVersion: 1, governanceVersion: '1.4.0' };
  }

  static loadRegistry(rootDir) {
    const registryPath = path.join(rootDir, '.agents/registry.json');
    if (fs.existsSync(registryPath)) {
      try {
        return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      } catch (err) {
        console.error(`⚠️ Unable to parse registry.json: ${err.message}`);
      }
    }
    return { schemaVersion: 1, registryVersion: '1.4.0', skills: {} };
  }

  static loadPolicies(rootDir) {
    const policiesDir = path.join(rootDir, '.agents/policies');
    const policies = {};
    if (!fs.existsSync(policiesDir)) return policies;

    const files = fs.readdirSync(policiesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = path.basename(file, '.json');
        try {
          policies[key] = JSON.parse(fs.readFileSync(path.join(policiesDir, file), 'utf8'));
        } catch (err) {
          console.error(`❌ Error reading policy JSON ${file}:`, err.message);
        }
      }
    }
    return policies;
  }

  static discoverRules(rootDir) {
    const rulesDir = path.join(rootDir, '.agents/scripts/rules');
    if (!fs.existsSync(rulesDir)) return [];

    const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
    const rulePlugins = [];

    for (const entry of entries) {
      let pluginModule = null;
      let rulePath = '';

      if (entry.isDirectory()) {
        const indexPath = path.join(rulesDir, entry.name, 'index.js');
        if (fs.existsSync(indexPath)) {
          rulePath = indexPath;
          pluginModule = require(indexPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
        rulePath = path.join(rulesDir, entry.name);
        pluginModule = require(rulePath);
      }

      if (pluginModule) {
        const meta = pluginModule.meta || {
          id: pluginModule.name ? pluginModule.name.toUpperCase().replace(/\s+/g, '_') : entry.name.toUpperCase(),
          name: pluginModule.name || entry.name,
          category: pluginModule.category || 'GENERAL',
          severity: pluginModule.severity || 'WARNING',
          dependsOn: pluginModule.dependsOn || [],
          description: pluginModule.description || ''
        };

        rulePlugins.push({
          meta,
          execute: pluginModule.execute,
          path: rulePath
        });
      }
    }

    return rulePlugins;
  }
}

module.exports = { RuleLoader };
