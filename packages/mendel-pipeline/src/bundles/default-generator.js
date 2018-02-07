const debug = require('debug')('verbose:mendel:generator:default');

module.exports = defaultGenerator;
function defaultGenerator(bundle, doneBundles, registry) {
    const {entries} = bundle.options;
    const {runtime='browser'} = bundle.options.options;
    const resolvedEntries = bundle.entries || new Map();

    // Cannot do anything if entries is missing. Abort.
    if (!entries) return;

    let order = 0;
    entries.forEach(entrance => {
        registry.getEntriesByGlob([entrance]).forEach(entry => {
            const {normalizedId, type} = entry;
            registry.walk(normalizedId, {types: [type], runtime}, (dep) => {
                if (resolvedEntries.has(dep.id)) return false;
                if (dep.normalizedId === entry.normalizedId) dep.entry = true;
                order++;
                resolvedEntries.set(dep.id, Object.assign({order}, dep));
                debug(`${bundle.id}:${order}:${dep.id}`);
            });
        });
    });

    bundle.entries = resolvedEntries;

    return bundle;
}
