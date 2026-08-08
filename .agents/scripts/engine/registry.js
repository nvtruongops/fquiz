/**
 * Rule Registry & DAG Topological Layer Graph Resolver v2.1
 */

class RuleRegistry {
  /**
   * Sorts rules into topological execution layers (Layer 0, Layer 1, Layer 2...).
   * Rules in the same layer have no dependencies on each other and can execute in parallel via Promise.all().
   */
  static resolveExecutionLayers(rules) {
    const ruleMap = new Map();
    rules.forEach(r => ruleMap.set(r.meta.id, r));

    const inDegree = new Map();
    const adjList = new Map();

    // Initialize graph structures
    rules.forEach(r => {
      inDegree.set(r.meta.id, 0);
      adjList.set(r.meta.id, []);
    });

    // Build DAG edges
    rules.forEach(r => {
      const deps = r.meta.dependsOn || [];
      deps.forEach(depId => {
        if (ruleMap.has(depId)) {
          adjList.get(depId).push(r.meta.id);
          inDegree.set(r.meta.id, (inDegree.get(r.meta.id) || 0) + 1);
        }
      });
    });

    // Group into execution layers
    const layers = [];
    let queue = [];

    // Layer 0: nodes with in-degree 0
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });

    while (queue.length > 0) {
      const currentLayer = queue.map(id => ruleMap.get(id));
      layers.push(currentLayer);

      const nextQueue = [];
      for (const id of queue) {
        const neighbors = adjList.get(id) || [];
        for (const neighbor of neighbors) {
          inDegree.set(neighbor, inDegree.get(neighbor) - 1);
          if (inDegree.get(neighbor) === 0) {
            nextQueue.push(neighbor);
          }
        }
      }
      queue = nextQueue;
    }

    return layers;
  }
}

module.exports = { RuleRegistry };
