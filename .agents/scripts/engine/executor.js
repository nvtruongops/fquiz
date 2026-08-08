/**
 * Async Parallel & Layered Rule Executor Engine v2.1
 */

class RuleExecutor {
  static async executeRule(rule, context) {
    const logger = context.createLogger(rule.meta.id);

    const ruleCtx = {
      workspaceRoot: context.workspaceRoot,
      manifest: context.manifest,
      policies: context.policies,
      fs: context.fs,
      path: context.path,
      logger,
      logPass: (msg) => logger.pass(msg),
      logFail: (msg) => logger.error(msg),
      logWarn: (msg) => logger.warn(msg),
      logInfo: (msg) => logger.info(msg)
    };

    const startTime = Date.now();
    let res = null;

    try {
      res = await rule.execute(ruleCtx);
    } catch (err) {
      logger.error(`Execution crash in rule ${rule.meta.id}: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    const logs = logger.getLogs();

    return {
      meta: rule.meta,
      passed: res && res.passed !== undefined ? res.passed : logs.errors.length === 0,
      errors: (res && res.errors) ? [...logs.errors, ...res.errors] : logs.errors,
      warnings: (res && res.warnings) ? [...logs.warnings, ...res.warnings] : logs.warnings,
      passes: (res && res.passes) ? [...logs.passes, ...res.passes] : logs.passes,
      info: (res && res.info) ? [...logs.info, ...res.info] : logs.info,
      metrics: (res && res.metrics) ? res.metrics : { durationMs }
    };
  }

  /**
   * Executes layers sequentially; executes rules within each layer in parallel via Promise.all().
   */
  static async executeLayers(layers, context) {
    const allResults = [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      // Run all rules in current DAG layer in parallel
      const layerResults = await Promise.all(
        layer.map(rule => RuleExecutor.executeRule(rule, context))
      );
      allResults.push(...layerResults);
    }
    return allResults;
  }
}

module.exports = { RuleExecutor };
