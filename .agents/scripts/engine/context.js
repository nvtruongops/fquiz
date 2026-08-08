/**
 * Rule Context Factory for fquiz AI Agent Rule Engine v2.1
 */

const fs = require('fs');
const path = require('path');

class RuleContext {
  constructor({ workspaceRoot, manifest, registry, policies, severityOverride }) {
    this.workspaceRoot = workspaceRoot;
    this.manifest = manifest;
    this.registry = registry;
    this.policies = policies;
    this.severityOverride = severityOverride;
    this.fs = fs;
    this.path = path;
  }

  createLogger(ruleId) {
    const logs = { passes: [], warnings: [], errors: [], info: [] };

    return {
      pass: (msg) => logs.passes.push(msg),
      warn: (msg) => logs.warnings.push(msg),
      error: (msg) => logs.errors.push(msg),
      info: (msg) => logs.info.push(msg),
      getLogs: () => logs
    };
  }

  getPolicy(ruleId) {
    const key = Object.keys(this.policies).find(
      k => this.policies[k].id === ruleId || k === ruleId.toLowerCase().replace(/_/g, '-')
    );
    return key ? this.policies[key] : null;
  }
}

module.exports = { RuleContext };
