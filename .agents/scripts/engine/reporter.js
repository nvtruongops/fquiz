/**
 * Multi-Format Output Reporter Engine v2.1 (Console, JSON, SARIF)
 */

class RuleReporter {
  static renderConsole(results, { isStrict, manifest }) {
    console.log(`\n🤖 AI AGENT RULE ENGINE VERIFICATION [Governance v${manifest.governanceVersion || '1.4.0'} | Strict Mode: ${isStrict ? 'ON 🛡️' : 'OFF'}]`);
    console.log(`================================================================\n`);

    let totalPassed = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;

    for (const res of results) {
      const { meta, errors, warnings, passes, info } = res;
      console.log(`▶️ Executing Rule [${meta.id}]: ${meta.name || meta.id} [Category: ${meta.category} | Severity: ${meta.severity}]`);

      for (const passMsg of passes) {
        console.log(`  [PASS] ${passMsg}`);
        totalPassed++;
      }

      for (const infoMsg of info) {
        console.log(`  [INFO] ${infoMsg}`);
        totalInfo++;
      }

      for (const warnMsg of warnings) {
        console.log(`  [WARN] ${warnMsg}`);
        totalWarnings++;
      }

      for (const errorMsg of errors) {
        console.log(`  [FAIL] ${errorMsg}`);
        totalErrors++;
      }

      console.log(``);
    }

    console.log(`================================================================`);
    console.log(`📊 VERIFICATION SUMMARY REPORT (Gov v${manifest.governanceVersion || '1.4.0'})`);
    console.log(`================================================================`);

    for (const res of results) {
      const { meta, errors, warnings } = res;
      const statusIcon = (errors.length === 0 && (!isStrict || warnings.length === 0)) ? '✅ [PASS]' : '❌ [FAIL]';
      console.log(`${statusIcon} [${meta.severity}] [${meta.category}] - ${meta.name || meta.id} (${meta.id})`);
    }

    console.log(`----------------------------------------------------------------`);
    console.log(`Total Passed Checks: ${totalPassed} | Errors: ${totalErrors} | Warnings: ${totalWarnings} | Info: ${totalInfo}`);
    console.log(`================================================================\n`);

    const hasFailed = results.some(r => r.errors.length > 0 || (isStrict && r.meta.severity === 'ERROR' && r.warnings.length > 0));

    if (hasFailed) {
      console.error(`❌ [FAILURE] VIOLATIONS DETECTED (Errors: ${totalErrors}, Strict Warnings: ${totalWarnings})`);
      return false;
    } else {
      console.log(`🎉 TẤT CẢ CÁC QUY TẮC ĐỀU HỢP LỆ!`);
      return true;
    }
  }

  static renderJson(results, { isStrict, manifest }) {
    const summary = {
      governanceVersion: manifest.governanceVersion || '1.4.0',
      timestamp: new Date().toISOString(),
      isStrict,
      passed: results.every(r => r.errors.length === 0 && (!isStrict || r.warnings.length === 0)),
      rules: results.map(r => ({
        id: r.meta.id,
        name: r.meta.name,
        category: r.meta.category,
        severity: r.meta.severity,
        passed: r.passed,
        errors: r.errors,
        warnings: r.warnings,
        passes: r.passes,
        info: r.info,
        metrics: r.metrics
      }))
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary.passed;
  }

  static renderSarif(results, { manifest }) {
    const sarifReport = {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "fquiz AI Agent Governance Engine",
            version: manifest.governanceVersion || "1.4.0",
            rules: results.map(r => ({
              id: r.meta.id,
              name: r.meta.name,
              shortDescription: { text: r.meta.description || r.meta.name }
            }))
          }
        },
        results: results.flatMap(r => {
          return [...r.errors, ...r.warnings].map(msg => ({
            ruleId: r.meta.id,
            level: r.errors.includes(msg) ? "error" : "warning",
            message: { text: msg }
          }));
        })
      }]
    };
    console.log(JSON.stringify(sarifReport, null, 2));
    return results.every(r => r.errors.length === 0);
  }
}

module.exports = { RuleReporter };
