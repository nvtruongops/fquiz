/**
 * fquiz AI Agent Governance Rule Engine Entrypoint Wrapper v2.1
 * 
 * Multi-Format, Layered DAG Parallel Modular Engine Architecture
 */

const path = require('path');
const { RuleContext } = require('./engine/context');
const { RuleLoader } = require('./engine/loader');
const { RuleRegistry } = require('./engine/registry');
const { RuleExecutor } = require('./engine/executor');
const { RuleReporter } = require('./engine/reporter');

const ROOT_DIR = path.resolve(__dirname, '../../');

// Parse CLI Arguments
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const formatJson = args.includes('--json');
const formatSarif = args.includes('--sarif');
const categoryFilter = (args.find(a => a.startsWith('--category=')) || '').split('=')[1];
const ruleFilter = (args.find(a => a.startsWith('--rule=')) || '').split('=')[1];

async function run() {
  const manifest = RuleLoader.loadManifest(ROOT_DIR);
  const registry = RuleLoader.loadRegistry(ROOT_DIR);
  const policies = RuleLoader.loadPolicies(ROOT_DIR);
  let rules = RuleLoader.discoverRules(ROOT_DIR);

  // Apply CLI Filters
  if (categoryFilter) {
    rules = rules.filter(r => r.meta && r.meta.category && r.meta.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  if (ruleFilter) {
    rules = rules.filter(r => r.meta && (r.meta.id.toLowerCase() === ruleFilter.toLowerCase() || r.meta.id === ruleFilter));
  }

  // Resolve DAG Layers
  const layers = RuleRegistry.resolveExecutionLayers(rules);

  // Create Context
  const context = new RuleContext({
    workspaceRoot: ROOT_DIR,
    manifest,
    registry,
    policies
  });

  // Execute Layered Rules in Parallel (Promise.all per layer)
  const results = await RuleExecutor.executeLayers(layers, context);

  // Render Format Report
  let passed = true;
  if (formatJson) {
    passed = RuleReporter.renderJson(results, { isStrict, manifest });
  } else if (formatSarif) {
    passed = RuleReporter.renderSarif(results, { isStrict, manifest });
  } else {
    passed = RuleReporter.renderConsole(results, { isStrict, manifest });
  }

  process.exit(passed ? 0 : 1);
}

run().catch(err => {
  console.error(`💥 Fatal Engine Error: ${err.message}\n${err.stack}`);
  process.exit(1);
});
