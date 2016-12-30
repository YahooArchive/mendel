const debug = require('debug')('mendel:generator:extract');

function generatorExtract(bundle, doneBundles, registry) {
    const {extractFrom, extractEntries} = bundle.options.options;
    const fromBundle = doneBundles.find(done => {
        return done.options.id === extractFrom;
    });

    if (!fromBundle) {
        return debug([
            `[${bundle.options.extractFrom}] bundle is not created before`,
            'reaching the extract.',
        ].join(' '));
    }

    const extractedBundle = new Map();
    const mainEntryIds = new Set();

    // Collect dependencies of main as if lazy was not there
    // Collect dependencies of lazy bundle
    registry.getEntriesByGlob(fromBundle.options.entries).forEach(entry => {
        const {normalizedId, type} = entry;
        registry.walk(normalizedId, type, (dep) => {
            if (extractEntries.indexOf(dep.normalizedId) >= 0) {
                registry.walk(dep.normalizedId, dep.type, function(entry) {
                    extractedBundle.set(entry.id, entry);
                });
                return false;
            }

            mainEntryIds.add(dep.id);
        });
    });

    // From the main entry, now, we pick and shift things around.
    fromBundle.entries.forEach(entry => {
        const {id} = entry;
        // case when entry only exist in the lazy bundle
        if (!mainEntryIds.has(id)) return fromBundle.entries.delete(id);
        // case when entry exist both on lazy and main. Should remove it from
        // lazy and make main expose it
        if (extractedBundle.has(id)) {
            extractedBundle.delete(id);
            entry.expose = id;
        }
    });

    bundle.entries = extractedBundle;
    return bundle;
}

module.exports = generatorExtract;
