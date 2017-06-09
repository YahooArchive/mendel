const debug = require('debug')('mendel:outlet:browserpack');
const fs = require('fs');
const browserpack = require('mendel-browser-pack');
const INLINE_MAP_PREFIX = '//# sourceMappingURL=data:application/json;base64,';

function matchVar(entries, multiVariations) {
    for (let i = 0; i < multiVariations.length; i++) {
        const varId = multiVariations[i];
        const found = entries.find(entry => {
            return entry.variation === varId && entry.runtime !== 'main';
        });
        if (found) return found;
    }
}

module.exports = class BrowserPackOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options, id}, variations) {
        return new Promise((resolve, reject) => {
            const bundles = this.getPackJSON(entries);
            const arrData = bundles
                .map(({data}) => matchVar(data, variations))
                // There can be bundle that does not pertain to certain variational chain (and no entry on base var)
                .filter(Boolean);
            const stream = browserpack(arrData, options.browserPackOptions);

            if (!this.config.noout && options.outfile) {
                // If `outfile` exists, output it to appropriate file
                const outStream = fs.createWriteStream(options.outfile);
                stream.pipe(outStream);
                outStream.on('end', resolve);
                outStream.on('error', reject);
                stream.on('error', reject);
            } else {
                setImmediate(() => resolve(stream));
            }
        });
    }

    dataFromItem(item) {
        const deps = {};
        Object.keys(item.deps).forEach(literal => {
            deps[literal] = item.deps[literal]['browser'];
        });
        const data = {
            id: item.normalizedId,
            normalizedId: item.normalizedId,
            // Clone the object so mutating it does not mutate source entry
            deps,
            runtime: item.runtime,
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            // This is supposed to be file path but our sourcemap already includes it
            // so '.' is sufficient.
            sourceFile: '.',
            // Kinda ugly but browser pack uses "combine-source-map" which expects
            // inline source map which gets removed when putting multiple files together
            // as a bundle.
            source: !item.map ? item.source : `${item.source}
${INLINE_MAP_PREFIX}${new Buffer(JSON.stringify(item.map)).toString('base64')}`,
            entry: item.entry,
            expose: item.expose,
            map: item.map,
        };

        return data;
    }

    getPackJSON(entries) {
        const groupedByNorm = new Map();
        const depToData = new Map();

        entries.forEach(item => {
            const id = item.normalizedId;
            const data = this.dataFromItem(item);
            const entry = groupedByNorm.get(id) || {
                id: item.normalizedId,
                variations: [],
                data: [],
            };

            if (entry.variations.includes(data.variation)) {
                return debug([
                    `${entry.variations} vs.`,
                    `${item.id}|${item.variation}`,
                    'WARN: normalizedId and variation collision',
                ].join(' '));
            }

            entry.data.push(data);
            entry.variations.push(data.variation);

            entry.entry = entry.entry || !!item.expose;
            entry.expose = entry.expose || item.expose;
            groupedByNorm.set(id, entry);

            // this will be used when we shorten internal module's id
            // to index
            Object.keys(data.deps).forEach(literal => {
                const norm = data.deps[literal];
                if (!depToData.has(norm)) depToData.set(norm, []);
                depToData.get(norm).push({deps: data.deps, literal});
            });
        });

        return Array.from(groupedByNorm.values()).map((entry, index) => {
            const internal = !entry.entry && !entry.expose;
            if (!internal) return entry;

            const norm = entry.id;
            entry.data.forEach(d => d.id = index);
            if (depToData.has(norm)) {
                depToData.get(norm).forEach(({deps, literal}) => {
                    deps[literal] = index;
                });
            }
            return entry;
        });
    }
};
