module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry) {
    const {entries} = bundle.options;
    const {runtime='browser'} = bundle.options.options;
    const resolvedEntries = bundle.entries || new Map();

    // Cannot do anything if entries is missing. Abort.
    if (!entries) return;

    registry.getEntriesByGlob(entries).forEach(entry => {
        const {normalizedId, type} = entry;
        const types = [type, 'node_modules'];
        registry.walk(normalizedId, {types, runtime}, (dep) => {
            if (resolvedEntries.has(dep.id)) return false;
            if (dep === entry) dep.entry = true;
            resolvedEntries.set(dep.id, dep);
        });
    });
    bundle.entries = resolvedEntries;

    return bundle;
}
