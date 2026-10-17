// Hermes/RN não implementa a timeline da Performance API web
// (performance.measure/clearMeasures/...). O React 19 em modo dev e
// libs 3D (react-three-fiber) as chamam no commit de efeitos — sem
// isso, crash: "performance.clearMeasures is not a function".
const perf = globalThis.performance as unknown as Record<string, unknown> | undefined;

if (perf) {
  const noop = () => {};
  const noops = ['mark', 'measure', 'clearMarks', 'clearMeasures'];
  for (const key of noops) {
    if (typeof perf[key] !== 'function') perf[key] = noop;
  }
  const emptyList = () => [];
  for (const key of ['getEntries', 'getEntriesByType', 'getEntriesByName']) {
    if (typeof perf[key] !== 'function') perf[key] = emptyList;
  }
}
