const path = require('path');

module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry, options) {
    const entries = bundle.options.entries;
    const resolvedEntries = new Map();

    entries.map(entry => {
        const absPath = path.resolve(options.baseConfig.dir, entry);
        const relPath = path.relative(options.projectRoot, absPath);
        return './' + relPath;
    }).forEach(entry => {
        // should throw if there is no entry by that id...
        if (!registry.hasEntry(entry)) {
            throw new Error(`Could not find a file at ${entry}`);
        }

        const {normalizedId} = registry.getEntry(entry);
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
