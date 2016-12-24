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

    fromBundle.options.entries.forEach(entry => {
        const normalizedId = registry.hasEntry(entry) ?
            registry.getEntry(entry).normalizedId :
            entry;
        registry.walk(normalizedId, (dep) => {
            if (extractEntries.indexOf(dep.normalizedId) >= 0) {
                registry.walk(dep.normalizedId, function(entry) {
                    extractedBundle.set(entry.id, entry);
                });
                return false;
            }

            mainEntryIds.add(dep.id);
        });
    });

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
