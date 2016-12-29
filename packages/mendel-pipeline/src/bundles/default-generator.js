module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry) {
    const entries = bundle.options.entries;
    const resolvedEntries = new Map();

    registry.getEntriesByGlob(entries).forEach(entry => {
        const {normalizedId} = entry;
        registry.walk(normalizedId, function(dep) {
            if (!resolvedEntries.has(dep.id)) {
                if (dep === entry) {
                    dep.entry = true;
                }
                resolvedEntries.set(dep.id, dep);
            }
        });
    });

    bundle.entries = resolvedEntries;
    return bundle;
}
