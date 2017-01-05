module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry) {
    const entries = bundle.options.entries;
    const resolvedEntries = bundle.entries || new Map();

    registry.getEntriesByGlob(entries).forEach(entry => {
        const {normalizedId, type} = entry;
        registry.walk(normalizedId, [type, 'node_modules'], function(dep) {
            if (resolvedEntries.has(dep.id)) return false;
            if (dep === entry) dep.entry = true;
            resolvedEntries.set(dep.id, dep);
        });
    });

    bundle.entries = resolvedEntries;
    return bundle;
}
