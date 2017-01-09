const debug = require('debug')('mendel:outlet:manifest');
const fs = require('fs');
const browserpack = require('browser-pack');

module.exports = class ManifestOutlet {
    constructor(options) {
        this.config = options;
    }

    perform({entries, options}, variation) {
        return new Promise((resolve, reject) => {
            // globals like, "process", handling
            const processEntries = Array.from(entries.values())
                .filter(({normalizedId}) => normalizedId === 'process');
            processEntries.forEach(({id}) => entries.delete(id));
            const hasProcess = processEntries.length > 0;

            const bundles = this.getV1Manifest(entries);
            const pack = browserpack(
                Object.assign(
                    {},
                    options.browserPackOptions,
                    {
                        raw: true, // since we pass Object instead of JSON string
                        hasExports: true, // exposes require globally. Required for multi-bundles.
                    }
                )
            );

            if (options.outfile) {
                let source = '';
                if (hasProcess) source = '(function(){var process={env: {}};';
                // If `outfile` exists, output it to appropriate file
                pack.on('error', reject);
                pack.on('data', buf => source += buf.toString());
                pack.on('end', () => {
                    if (hasProcess) source += '})();';
                    fs.writeFileSync(options.outfile, source);
                    resolve();
                });
            } else {
                // Return a stream back if outfile is not declared.
                // You can pipe it or do whatever with it.
                setImmediate(() => resolve(pack));
            }

            bundles.forEach(({variations, data}) => {
                const dataInd = variations.findIndex(v => variation === v);
                pack.write(data[dataInd]);
            });
            pack.end();
        });
    }

    dataFromItem(item) {
        const data = {
            id: item.normalizedId,
            deps: item.deps,
            file: item.id,
            variation: item.variation || this.config.baseConfig.dir,
            source: item.source,
            entry: item.entry,
            expose: item.expose,
        };

        return data;
    }

    getV1Manifest(entries) {
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
