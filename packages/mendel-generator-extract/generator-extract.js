const debug = require('debug')('mendel:generator:extract');

function generatorExtract(bundle, doneBundles, registry) {
    const {extractFrom, extractEntries} = bundle.options.options;
    const extracts = registry.getEntriesByGlob(extractEntries);
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

    // Collect dependencies of lazy bundle
    extracts.forEach(({normalizedId, type}) => {
        registry.walk(normalizedId, [type, 'node_modules'], entry => {
            // Returning false stops from walking further
            // Since this code path is already visited; short circuit out of the
            // walk. Same code path can be visited when multiple entries
            // share the same dependencies
            if (extractedBundle.has(entry.id)) return false;
            extractedBundle.set(entry.id, entry);
        });
    });

    // Collect dependencies of main as if lazy was not there
    registry.getEntriesByGlob(fromBundle.options.entries)
    .forEach(({normalizedId, type}) => {
        registry.walk(normalizedId, [type, 'node_modules'], dep => {
            // Returning false stops from walking further
            // Since this code path is already visited; short circuit out of the
            // walk. Same code path can be visited when multiple entries
            // share the same dependencies
            // If lazy is part of the dependecy chain, stop from going further
            // to disregard that code path
            if (mainEntryIds.has(dep.id) || extracts.indexOf(dep) >= 0)
                return false;

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
