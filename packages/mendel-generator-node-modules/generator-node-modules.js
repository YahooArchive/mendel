function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = function generatorNodeModule(bundle, doneBundles, registry) {
    const {entries} = bundle.options;
    const nodeModules = new Map();
    const nodeModulesNorm = new Map();
    bundle.entries = nodeModules;

    // TODO factor this out to separate sharable component
    registry.getEntriesByGlob(entries).forEach(entry => {
        const {normalizedId, type} = entry;
        registry.walk(normalizedId, {types: [type]}, (dep) => {
            if (nodeModules.has(dep.id)) return false;
            if (dep.normalizedId === entry.normalizedId) dep.entry = true;
            nodeModules.set(dep.id, dep);
        });
    });

    const from = bundle.options.options.from || 'all';
    const fromBundle = Array.isArray(from) ? from : [from];
    const fromFilter = fromBundle.find(id => id === 'all') ?
        () => true :
        ({id}) => fromBundle.some(bundleId => id === bundleId);

    doneBundles
    .filter(fromFilter)
    .forEach(doneBundle => {
        const {entries} = doneBundle;

        Array.from(entries.values())
        .filter(({id}) => isNodeModule(id) || nodeModules.has(id))
        .forEach(entry => {
            // Remove it from main bundle
            entries.delete(entry.id);
            // and add it to the node module bundle;
            nodeModules.set(entry.id, entry);
            nodeModulesNorm.set(entry.normalizedId, entry);
            entry.expose = null;
        });

        Array.from(entries.values())
        .filter(({id}) => !isNodeModule(id))
        .forEach(entry => {
            const {deps} = entry;
            Object.keys(deps)
            .forEach(depLiteral => {
                const dep = deps[depLiteral]['browser'];
                if (!nodeModulesNorm.has(dep)) return;

                const depEntry = nodeModulesNorm.get(dep);
                // Only node modules that are being used by main bundle
                // should be expose or "required" in browserify sense.
                // Unncessary but congruent to ManifestV1
                depEntry.expose = depEntry.normalizedId;
            });
        });
    });

    return bundle;
};
