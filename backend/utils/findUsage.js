function findFileUsage(graph, targetFile) {

  const usedBy = [];

  for (const file in graph) {

    const deps = graph[file];

    if (deps.includes(targetFile)) {
      usedBy.push(file);
    }

  }

  return usedBy;
}

module.exports = { findFileUsage };