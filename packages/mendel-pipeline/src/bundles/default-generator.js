module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry) {
    const entries = bundle.options.entries;
    const resolvedEntries = new Map();

    entries.forEach(entry => {
        const normalizedId = registry.hasEntry(entry) ?
            registry.getEntry(entry).normalizedId :
            entry;
        registry.walk(normalizedId, function(dep) {
            if (!resolvedEntries.has(dep.id)) {
                if (dep.normalizedId === entry) {
                    dep.entry = true;
                }
                resolvedEntries.set(dep.id, dep);
            }
        });
    });

    bundle.entries = resolvedEntries;
    return bundle;
}
